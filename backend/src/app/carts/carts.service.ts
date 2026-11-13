import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CartItem, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { withRetry } from '../../common/prisma/with-retry';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import {
  ProductVariantsService,
  SaleVariant,
} from '../product-variants/product-variants.service';
import {
  AddCartItemDto,
  MAX_ITEMS_PER_CART,
  MAX_QUANTITY_PER_ITEM,
} from './dto/cart.dto';
import { getSaleStatus, isPurchasable, pickImageUrl, SaleStatus } from './sale-status';

/**
 * Giỏ hàng: 1 document / user, chỉ lưu variantID + số lượng. Giá, tồn kho, trạng thái
 * luôn đọc lại từ DB khi xem giỏ (không lưu giá vào giỏ, không tin giá từ client).
 */
@Injectable()
export class CartsService extends PrismaBaseService<'cart'> {
  constructor(
    prismaService: PrismaService,
    private readonly productVariantsService: ProductVariantsService,
  ) {
    super(prismaService, 'cart');
  }

  /** GET /me/cart: kèm giá, tồn kho hiện tại và trạng thái từng dòng. Mới thêm hiện trước. */
  async getCart(userID: string) {
    const items = await this.getItems(userID);
    const variants = await this.productVariantsService.findForSale(items.map((i) => i.variantID));
    const byID = new Map(variants.map((v) => [v.id, v]));

    const lines = [...items]
      .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
      .map((item) => toCartLine(item, byID.get(item.variantID)));
    const purchasable = lines.filter((l) => isPurchasable(l.status));

    return {
      items: lines,
      totalQuantity: purchasable.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: purchasable.reduce((sum, l) => sum + l.lineTotal, 0), // chỉ tính dòng mua được
      canCheckout: lines.length > 0 && purchasable.length === lines.length,
    };
  }

  async addItem(userID: string, { variantID, quantity }: AddCartItemDto) {
    const variant = await this.findPurchasableVariant(variantID);
    await this.mutateItems(userID, (items) => {
      const existing = items.find((i) => i.variantID === variantID);
      if (!existing && items.length >= MAX_ITEMS_PER_CART) {
        throw new BadRequestException(`Giỏ hàng tối đa ${MAX_ITEMS_PER_CART} sản phẩm khác nhau`);
      }
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      assertQuantity(variant, nextQuantity);

      return existing
        ? items.map((i) => (i === existing ? { ...i, quantity: nextQuantity } : i))
        : [...items, { variantID, quantity, addedAt: new Date() }];
    });
    return this.getCart(userID);
  }

  async updateItem(userID: string, variantID: string, quantity: number) {
    const variant = await this.findPurchasableVariant(variantID);
    assertQuantity(variant, quantity);
    await this.mutateItems(userID, (items) => {
      if (!items.some((i) => i.variantID === variantID)) {
        throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
      }
      return items.map((i) => (i.variantID === variantID ? { ...i, quantity } : i));
    });
    return this.getCart(userID);
  }

  /** Xóa 1 dòng (không có trong giỏ cũng trả về giỏ hiện tại). */
  async removeItem(userID: string, variantID: string) {
    await this.mutateItems(userID, (items) => items.filter((i) => i.variantID !== variantID));
    return this.getCart(userID);
  }

  async clearCart(userID: string) {
    await this.clear(userID);
    return this.getCart(userID);
  }

  // ───────────── dùng cho checkout (nhận tx) ─────────────

  async getItems(userID: string, db: Prisma.TransactionClient = this.prismaService) {
    const cart = await db.cart.findUnique({ where: { userID }, select: { items: true } });
    return cart?.items ?? [];
  }

  async clear(userID: string, db: Prisma.TransactionClient = this.prismaService) {
    await db.cart.updateMany({ where: { userID }, data: { items: { set: [] } } });
  }

  // ───────────── helpers ─────────────

  private async findPurchasableVariant(variantID: string) {
    const [variant] = await this.productVariantsService.findForSale([variantID]);
    if (getSaleStatus(variant, 1) === 'unavailable') {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc đã ngừng bán');
    }
    return variant;
  }

  /**
   * Đọc - sửa - ghi lại cả mảng items trong transaction (Prisma không có `pull` cho composite list).
   * 2 request sửa giỏ cùng lúc → xung đột P2034 → chạy lại, không ghi đè mất thay đổi.
   */
  private mutateItems(userID: string, change: (items: CartItem[]) => CartItem[]) {
    return withRetry(() =>
      this.prismaService.$transaction(async (tx) => {
        const items = change(await this.getItems(userID, tx));
        await tx.cart.upsert({
          where: { userID },
          create: { userID, items },
          update: { items: { set: items } },
        });
      }),
    );
  }
}

/** Không cho vượt tồn kho (trừ hàng đặt làm) và giới hạn số lượng mỗi dòng. */
const assertQuantity = (variant: SaleVariant, quantity: number) => {
  if (quantity > MAX_QUANTITY_PER_ITEM) {
    throw new BadRequestException(`Mỗi sản phẩm tối đa ${MAX_QUANTITY_PER_ITEM} cái`);
  }
  if (!isPurchasable(getSaleStatus(variant, quantity))) {
    throw new ConflictException(
      variant.stock > 0 ? `"${variant.name}" chỉ còn ${variant.stock} sản phẩm` : `"${variant.name}" đã hết hàng`,
    );
  }
};

const toCartLine = (item: CartItem, variant: SaleVariant | undefined) => {
  const status: SaleStatus = getSaleStatus(variant, item.quantity);
  if (!variant) {
    return { ...item, status, product: null, variant: null, lineTotal: 0 };
  }
  const { product } = variant;
  return {
    ...item,
    status,
    product: { id: product.id, name: product.name, slug: product.slug, imageUrl: pickImageUrl(variant) },
    variant: {
      name: variant.name,
      sku: variant.sku,
      options: variant.options,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      stock: variant.stock,
      ...(status === 'made_to_order' && { leadTimeDays: product.leadTimeDays }),
    },
    lineTotal: variant.price * item.quantity,
  };
};
