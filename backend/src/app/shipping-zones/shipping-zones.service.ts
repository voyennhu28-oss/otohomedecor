import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PROVINCES } from '../../common/constants/catalog.const';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import { CreateShippingZoneDto, UpdateShippingZoneDto } from './dto/shipping-zone.dto';

@Injectable()
export class ShippingZonesService extends PrismaBaseService<'shippingZone'> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'shippingZone');
  }

  // ───────────── public ─────────────

  /** GET /shipping-zones/provinces: 34 tỉnh, đánh dấu tỉnh đang giao được (cho dropdown địa chỉ). */
  async listProvinces() {
    const zones = await this.extended.findMany({
      where: { isActive: true },
      select: { provinces: true },
    });
    const supported = new Set(zones.flatMap((z) => z.provinces));
    return PROVINCES.map((name) => ({ name, supported: supported.has(name) }));
  }

  // ───────────── admin ─────────────

  findAll() {
    return this.extended.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
  }

  async findOne(id: string) {
    const zone = await this.extended.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('Không tìm thấy vùng giao hàng');
    return zone;
  }

  async create(dto: CreateShippingZoneDto) {
    if (dto.isActive) await this.assertNoOverlap(dto.provinces);
    return this.extended.create({ data: dto });
  }

  async update(id: string, dto: UpdateShippingZoneDto) {
    const current = await this.findOne(id);
    const isActive = dto.isActive ?? current.isActive;
    if (isActive && (dto.provinces || dto.isActive)) {
      await this.assertNoOverlap(dto.provinces ?? current.provinces, id);
    }
    return this.extended.update({ where: { id }, data: dto });
  }

  /** Xóa cứng: đơn hàng cũ đã lưu sẵn phí ship nên không bị ảnh hưởng. */
  async remove(id: string) {
    await this.findOne(id);
    await this.extended.delete({ where: { id } });
    return { id };
  }

  // ───────────── dùng cho checkout ─────────────

  /** Vùng đang hoạt động chứa tỉnh này. Không có thì 400 (chưa giao tới). */
  async findForProvince(province: string, db: Prisma.TransactionClient = this.prismaService) {
    const zone = await db.shippingZone.findFirst({
      where: { isActive: true, provinces: { has: province } },
    });
    if (!zone) throw new BadRequestException(`Chưa hỗ trợ giao hàng tới ${province}`);
    return zone;
  }

  // ───────────── helpers ─────────────

  /** Một tỉnh chỉ được thuộc 1 vùng đang hoạt động, nếu không sẽ không biết tính phí theo vùng nào. */
  private async assertNoOverlap(provinces: string[], exceptID?: string) {
    const others = await this.extended.findMany({
      where: {
        isActive: true,
        provinces: { hasSome: provinces },
        ...(exceptID && { id: { not: exceptID } }),
      },
      select: { name: true, provinces: true },
    });
    if (!others.length) return;

    const wanted = new Set(provinces);
    const conflicts = others.map(
      (z) => `${z.provinces.filter((p) => wanted.has(p)).join(', ')} (vùng "${z.name}")`,
    );
    throw new ConflictException(`Tỉnh đã thuộc vùng khác đang hoạt động: ${conflicts.join('; ')}`);
  }
}
