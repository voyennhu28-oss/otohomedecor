import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Ném 409 nếu có SKU đã tồn tại. Dùng client gốc vì index @unique của SKU
 * tính cả variant đã xóa (variant xóa đã được đổi SKU thành "...--deleted-<id>").
 */
export const assertSkusAvailable = async (
  prisma: PrismaService,
  skus: string[],
) => {
  const existed = await prisma.productVariant.findMany({
    where: { sku: { in: skus } },
    select: { sku: true },
  });
  if (existed.length) {
    throw new ConflictException(
      `SKU đã tồn tại: ${existed.map((v) => v.sku).join(', ')}`,
    );
  }
};
