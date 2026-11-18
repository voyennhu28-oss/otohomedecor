import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { NOT_DELETED, PrismaService } from '../../common/prisma/prisma.service';
import { withRetry } from '../../common/prisma/with-retry';
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

export const SALE_VARIANT_SELECT = {
  id: true,
  productID: true,
  sku: true,
  name: true,
  options: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  weightKg: true,
  dimensions: true,
  images: true,
  isActive: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      status: true,
      allowBackorder: true,
      requiresAssembly: true,
      assemblyFee: true,
      leadTimeDays: true,
    },
  },
} satisfies Prisma.ProductVariantSelect;

export type SaleVariant = Prisma.ProductVariantGetPayload<{
  select: typeof SALE_VARIANT_SELECT;
}>;

export interface StockLine {
  variantID: string;
  quantity: number;
  name: string;
}

@Injectable()
export class ProductVariantsService extends PrismaBaseService<'productVariant'> {
  constructor(
    prismaService: PrismaService,
    private readonly productsService: ProductsService,
  ) {
    super(prismaService, 'productVariant');
  }

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

    return this.writeAndRecalculate(productID, false, (tx) =>
      tx.productVariant.create({ data: { ...dto, productID } }),
    );
  }

  async update(productID: string, variantID: string, dto: UpdateVariantDto) {
    await this.productsService.findOneOrThrow(productID);
    const current = await this.findInProductOrThrow(productID, variantID);

    const price = dto.price ?? current.price;
    const compareAtPrice =
      dto.compareAtPrice !== undefined
        ? dto.compareAtPrice
        : current.compareAtPrice;
    if (!isValidCompareAtPrice(price, compareAtPrice)) {
      throw new BadRequestException(COMPARE_AT_PRICE_MESSAGE);
    }
    if (dto.sku && dto.sku !== current.sku) {
      await assertSkusAvailable(this.prismaService, [dto.sku]);
    }

    const isDeactivating = current.isActive && dto.isActive === false;
    return this.writeAndRecalculate(productID, isDeactivating, (tx) =>
      tx.productVariant.update({ where: { id: variantID }, data: dto }),
    );
  }

  async remove(productID: string, variantID: string) {
    await this.productsService.findOneOrThrow(productID);
    const variant = await this.findInProductOrThrow(productID, variantID);

    await this.writeAndRecalculate(productID, variant.isActive, (tx) =>
      tx.productVariant.update({
        where: { id: variantID },
        data: {
          deletedAt: new Date(),
          sku: `${variant.sku}--deleted-${variantID}`,
        },
      }),
    );
    return { id: variantID };
  }

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
      const adjust = dto.adjust!;
      const result = await this.extended.updateMany({
        where: {
          id: variantID,
          ...NOT_DELETED,
          ...(adjust < 0 && { stock: { gte: -adjust } }),
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

  findForSale(
    ids: string[],
    db: Prisma.TransactionClient = this.prismaService,
  ) {
    if (!ids.length) return Promise.resolve([] as SaleVariant[]);
    return db.productVariant.findMany({
      where: { id: { in: ids }, ...NOT_DELETED },
      select: SALE_VARIANT_SELECT,
    });
  }

  async reserveStock(lines: StockLine[], tx: Prisma.TransactionClient) {
    for (const { variantID, quantity, name } of lines) {
      const { count } = await tx.productVariant.updateMany({
        where: { id: variantID, ...NOT_DELETED, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (count === 0) throw new ConflictException(`"${name}" không đủ hàng`);
    }
  }

  async restoreStock(
    lines: Omit<StockLine, 'name'>[],
    tx: Prisma.TransactionClient,
  ) {
    for (const { variantID, quantity } of lines) {
      await tx.productVariant.updateMany({
        where: { id: variantID },
        data: { stock: { increment: quantity } },
      });
    }
  }

  findLowStock(threshold: number, limit: number) {
    return this.extended.findMany({
      where: {
        isActive: true,
        stock: { lte: threshold },
        product: {
          is: {
            status: ProductStatus.active,
            allowBackorder: false,
            ...NOT_DELETED,
          },
        },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        stock: true,
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ stock: 'asc' }, { sku: 'asc' }],
      take: limit,
    });
  }

  private writeAndRecalculate<T>(
    productID: string,
    reducesSelling: boolean,
    write: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return withRetry(() =>
      this.prismaService.$transaction(async (tx) => {
        const result = await write(tx);
        await this.productsService.recalculateSummary(productID, {
          tx,
          ensureSelling: reducesSelling,
        });
        return result;
      }),
    );
  }

  private async findInProductOrThrow(productID: string, variantID: string) {
    const variant = await this.extended.findFirst({
      where: { id: variantID, productID },
    });
    if (!variant)
      throw new NotFoundException('Không tìm thấy variant của sản phẩm này');
    return variant;
  }
}
