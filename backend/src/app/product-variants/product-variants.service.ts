import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { NOT_DELETED, PrismaService } from '../../common/prisma/prisma.service';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import {
  COMPARE_AT_PRICE_MESSAGE,
  isValidCompareAtPrice,
} from '../products/dto/variant-input.schema';
import { ProductsService } from '../products/products.service';
import { assertSkusAvailable } from '../products/variant-sku';
import {
  CreateVariantDto,
  UpdateStockDto,
  UpdateVariantDto,
} from './dto/variant.dto';

/**
 * Quy tắc:
 *  - Sau mỗi lần tạo / sửa / xóa variant → tính lại minPrice, maxPrice, colors của product.
 *  - Sản phẩm đang "active" luôn phải còn ít nhất 1 variant đang bán.
 */
@Injectable()
export class ProductVariantsService extends PrismaBaseService<'productVariant'> {
  constructor(
    prismaService: PrismaService,
    private readonly productsService: ProductsService,
  ) {
    super(prismaService, 'productVariant');
  }

  /** Mọi variant chưa xóa của product (cả variant đang tắt). */
  async findByProduct(productID: string) {
    await this.productsService.findOneOrThrow(productID);
    return this.extended.findMany({
      where: { productID },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(productID: string, dto: CreateVariantDto) {
    await this.productsService.findOneOrThrow(productID);
    await assertSkusAvailable(this.prismaService, [dto.sku]);

    const variant = await this.extended.create({ data: { ...dto, productID } });
    await this.productsService.recalculateSummary(productID);
    return variant;
  }

  async update(productID: string, variantID: string, dto: UpdateVariantDto) {
    const product = await this.productsService.findOneOrThrow(productID);
    const current = await this.findInProductOrThrow(productID, variantID);

    const price = dto.price ?? current.price;
    const compareAtPrice =
      dto.compareAtPrice !== undefined ? dto.compareAtPrice : current.compareAtPrice;
    if (!isValidCompareAtPrice(price, compareAtPrice)) {
      throw new BadRequestException(COMPARE_AT_PRICE_MESSAGE);
    }
    if (dto.sku && dto.sku !== current.sku) {
      await assertSkusAvailable(this.prismaService, [dto.sku]);
    }
    if (current.isActive && dto.isActive === false) {
      await this.assertNotLastSellingVariant(product, variantID);
    }

    const variant = await this.extended.update({
      where: { id: variantID },
      data: dto,
    });
    await this.productsService.recalculateSummary(productID);
    return variant;
  }

  /** Soft delete, đổi SKU thành "...--deleted-<id>" để giải phóng SKU. */
  async remove(productID: string, variantID: string) {
    const product = await this.productsService.findOneOrThrow(productID);
    const variant = await this.findInProductOrThrow(productID, variantID);
    if (variant.isActive) {
      await this.assertNotLastSellingVariant(product, variantID);
    }

    await this.extended.update({
      where: { id: variantID },
      data: { deletedAt: new Date(), sku: `${variant.sku}--deleted-${variantID}` },
    });
    await this.productsService.recalculateSummary(productID);
    return { id: variantID };
  }

  /**
   * Đặt tồn kho ({ stock }) hoặc cộng / trừ ({ adjust }).
   * Trừ kho là atomic: chỉ trừ khi còn đủ, 2 admin trừ cùng lúc cũng không âm kho.
   */
  async updateStock(variantID: string, dto: UpdateStockDto) {
    const variant = await this.extended.findUnique({
      where: { id: variantID },
      select: { id: true, stock: true },
    });
    if (!variant) throw new NotFoundException('Không tìm thấy variant');

    if (dto.stock !== undefined) {
      await this.extended.update({
        where: { id: variantID },
        data: { stock: dto.stock },
      });
    } else {
      const adjust = dto.adjust!; // DTO bảo đảm có đúng 1 trong 2
      const result = await this.extended.updateMany({
        where: {
          id: variantID,
          ...NOT_DELETED,
          ...(adjust < 0 && { stock: { gte: -adjust } }), // chỉ trừ khi còn đủ
        },
        data: { stock: { increment: adjust } },
      });
      if (result.count === 0) {
        throw new ConflictException(
          `Không đủ tồn kho để trừ ${-adjust} (hiện còn ${variant.stock})`,
        );
      }
    }

    return this.extended.findUnique({
      where: { id: variantID },
      select: { id: true, sku: true, stock: true },
    });
  }

  // ───────────── helpers ─────────────

  private async findInProductOrThrow(productID: string, variantID: string) {
    const variant = await this.extended.findFirst({
      where: { id: variantID, productID },
    });
    if (!variant) throw new NotFoundException('Không tìm thấy variant của sản phẩm này');
    return variant;
  }

  /** Product đang bán thì không được tắt / xóa variant đang bán cuối cùng. */
  private async assertNotLastSellingVariant(
    product: { id: string; status: ProductStatus },
    variantID: string,
  ) {
    if (product.status !== ProductStatus.active) return;
    const otherSelling = await this.extended.count({
      where: { productID: product.id, isActive: true, id: { not: variantID } },
    });
    if (otherSelling === 0) {
      throw new ConflictException(
        'Đây là variant đang bán cuối cùng của sản phẩm đang hiển thị. Hãy thêm variant khác hoặc chuyển sản phẩm sang "draft" / "inactive" trước',
      );
    }
  }
}
