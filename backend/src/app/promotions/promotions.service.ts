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
import {
  getRuleViolation,
  getUnusableReason,
  normalizeRules,
} from './promotion.util';

export interface ApplyContext {
  subtotal: number;
  countUserUsage: (promotionID: string) => Promise<number>;
}

@Injectable()
export class PromotionsService extends PrismaBaseService<'promotion'> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'promotion');
  }

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
      this.extended.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...paginate(pagination),
      }),
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
    if (dto.code && dto.code !== current.code)
      await this.assertCodeAvailable(dto.code);

    const type = dto.type ?? current.type;
    const data = normalizeRules(dto, type);
    const violation = getRuleViolation({ ...current, ...data });
    if (violation) throw new BadRequestException(violation);

    return this.extended.update({ where: { id }, data });
  }

  async remove(id: string) {
    const promotion = await this.findOne(id);
    await this.client.update({
      where: { id },
      data: { deletedAt: new Date(), code: `${promotion.code}--deleted-${id}` },
    });
    return { id };
  }

  async findApplicable(
    code: string,
    { subtotal, countUserUsage }: ApplyContext,
    db: Prisma.TransactionClient = this.prismaService,
  ): Promise<Promotion> {
    const promotion = await db.promotion.findFirst({
      where: { code: code.trim().toUpperCase(), ...NOT_DELETED },
    });
    if (!promotion) throw new BadRequestException('Mã giảm giá không tồn tại');

    const usedByUser =
      promotion.perUserLimit != null ? await countUserUsage(promotion.id) : 0;
    const reason = getUnusableReason(promotion, { subtotal, usedByUser });
    if (reason) throw new BadRequestException(reason);
    return promotion;
  }

  async consume(
    promotion: Pick<Promotion, 'id' | 'usageLimit'>,
    tx: Prisma.TransactionClient,
  ) {
    const { count } = await tx.promotion.updateMany({
      where: {
        id: promotion.id,
        ...(promotion.usageLimit != null && {
          usedCount: { lt: promotion.usageLimit },
        }),
      },
      data: { usedCount: { increment: 1 } },
    });
    if (count === 0)
      throw new ConflictException('Mã giảm giá vừa hết lượt sử dụng');
  }

  async release(promotionID: string, tx: Prisma.TransactionClient) {
    await tx.promotion.updateMany({
      where: { id: promotionID, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }

  private async assertCodeAvailable(code: string) {
    const existed = await this.client.findUnique({
      where: { code },
      select: { id: true },
    });
    if (existed) throw new ConflictException(`Mã "${code}" đã tồn tại`);
  }
}
