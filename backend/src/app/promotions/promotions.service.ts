import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Promotion } from '@prisma/client';
import { paginate, toPage } from '../../common/dto/query.dto';
import { NOT_DELETED, PrismaService } from '../../common/prisma/prisma.service';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import {
  CreatePromotionDto,
  PromotionListQueryDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';
import { getRuleViolation, getUnusableReason, normalizeRules } from './promotion.util';

export interface ApplyContext {
  subtotal: number;
  /** Số đơn chưa hủy của user đã dùng mã (chỉ gọi khi mã có perUserLimit). */
  countUserUsage: (promotionID: string) => Promise<number>;
}

@Injectable()
export class PromotionsService extends PrismaBaseService<'promotion'> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'promotion');
  }

  // ───────────── admin ─────────────

  async findList({ q, isActive, ...pagination }: PromotionListQueryDto) {
    const where: Prisma.PromotionWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(q && {
        OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };
    const [list, totalItems] = await Promise.all([
      this.extended.findMany({ where, orderBy: { createdAt: 'desc' }, ...paginate(pagination) }),
      this.extended.count({ where }),
    ]);
    return toPage(list, totalItems, pagination.itemPerPage);
  }

  async findOne(id: string) {
    const promotion = await this.extended.findUnique({ where: { id } });
    if (!promotion) throw new NotFoundException('Không tìm thấy mã giảm giá');
    return promotion;
  }

  async create(dto: CreatePromotionDto) {
    await this.assertCodeAvailable(dto.code);
    return this.extended.create({ data: normalizeRules(dto, dto.type) });
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const current = await this.findOne(id);
    if (dto.code && dto.code !== current.code) await this.assertCodeAvailable(dto.code);

    const type = dto.type ?? current.type;
    const data = normalizeRules(dto, type);
    const violation = getRuleViolation({ ...current, ...data });
    if (violation) throw new BadRequestException(violation);

    return this.extended.update({ where: { id }, data });
  }

  /**
   * Soft delete, đổi code thành "<code>--deleted-<id>" để dùng lại được mã.
   * Đơn hàng cũ lưu sẵn promotionCode nên không bị ảnh hưởng.
   */
  async remove(id: string) {
    const promotion = await this.findOne(id);
    await this.client.update({
      where: { id },
      data: { deletedAt: new Date(), code: `${promotion.code}--deleted-${id}` },
    });
    return { id };
  }

  // ───────────── dùng cho checkout / orders (nhận tx) ─────────────

  /** Mã dùng được cho đơn này, ném 400 kèm lý do nếu không. */
  async findApplicable(
    code: string,
    { subtotal, countUserUsage }: ApplyContext,
    db: Prisma.TransactionClient = this.prismaService,
  ): Promise<Promotion> {
    const promotion = await db.promotion.findFirst({
      where: { code: code.trim().toUpperCase(), ...NOT_DELETED },
    });
    if (!promotion) throw new BadRequestException('Mã giảm giá không tồn tại');

    const usedByUser = promotion.perUserLimit != null ? await countUserUsage(promotion.id) : 0;
    const reason = getUnusableReason(promotion, { subtotal, usedByUser });
    if (reason) throw new BadRequestException(reason);
    return promotion;
  }

  /** Tăng usedCount ATOMIC: chỉ tăng khi còn lượt (2 đơn cùng lúc không vượt usageLimit). */
  async consume(promotion: Pick<Promotion, 'id' | 'usageLimit'>, tx: Prisma.TransactionClient) {
    const { count } = await tx.promotion.updateMany({
      where: {
        id: promotion.id,
        ...(promotion.usageLimit != null && { usedCount: { lt: promotion.usageLimit } }),
      },
      data: { usedCount: { increment: 1 } },
    });
    if (count === 0) throw new ConflictException('Mã giảm giá vừa hết lượt sử dụng');
  }

  /** Trả lại 1 lượt khi hủy đơn (không xuống dưới 0, kể cả mã đã bị xóa). */
  async release(promotionID: string, tx: Prisma.TransactionClient) {
    await tx.promotion.updateMany({
      where: { id: promotionID, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }

  // ───────────── helpers ─────────────

  /** Dùng client gốc: index @unique của code tính cả mã đã xóa. */
  private async assertCodeAvailable(code: string) {
    const existed = await this.client.findUnique({ where: { code }, select: { id: true } });
    if (existed) throw new ConflictException(`Mã "${code}" đã tồn tại`);
  }
}
