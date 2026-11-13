import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UserInfo } from '../../common/decorators/user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { withRetry } from '../../common/prisma/with-retry';
import { AddressesService } from '../addresses/addresses.service';
import { CartsService } from '../carts/carts.service';
import { pickImageUrl } from '../carts/sale-status';
import { OrdersService } from '../orders/orders.service';
import { ProductVariantsService } from '../product-variants/product-variants.service';
import { computeDiscount } from '../promotions/promotion.util';
import { PromotionsService } from '../promotions/promotions.service';
import { calculateShippingFee, estimateDeliveryDate } from '../shipping-zones/shipping.util';
import { ShippingZonesService } from '../shipping-zones/shipping-zones.service';
import { buildCheckoutLines, sumBy } from './checkout-lines';
import { CheckoutDto, CheckoutPreviewDto } from './dto/checkout.dto';

/**
 * Transaction checkout gồm khoảng 10 + số dòng truy vấn. Atlas ở xa có thể 100–200ms / truy vấn,
 * nên nới timeout mặc định (5s) của Prisma.
 */
const CHECKOUT_TX_OPTIONS = { maxWait: 5_000, timeout: 20_000 };

type Quote = Awaited<ReturnType<CheckoutService['quote']>>;

/** Không trả nguyên document địa chỉ ra ngoài, chỉ các field giao hàng. */
const toShippingAddress = ({ fullName, phone, province, district, ward, street }: Quote['address']) => ({
  fullName,
  phone,
  province,
  district,
  ward,
  street,
});

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cartsService: CartsService,
    private readonly addressesService: AddressesService,
    private readonly productVariantsService: ProductVariantsService,
    private readonly shippingZonesService: ShippingZonesService,
    private readonly promotionsService: PromotionsService,
    private readonly ordersService: OrdersService,
  ) {}

  /** POST /checkout/preview: bảng tính tiền giống hệt lúc đặt, không ghi DB. */
  async preview(user: UserInfo, dto: CheckoutPreviewDto) {
    const quote = await this.quote(user.userID, dto, this.prismaService);
    return {
      items: quote.lines.map((l) => ({
        variantID: l.variant.id,
        name: l.variant.product.name,
        variantName: l.variant.name,
        sku: l.variant.sku,
        imageUrl: pickImageUrl(l.variant),
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
        assemblyFee: l.assemblyFee,
        madeToOrder: !l.reserveStock,
      })),
      shippingAddress: toShippingAddress(quote.address),
      shippingZone: { name: quote.zone.name, estimatedDays: quote.zone.estimatedDays },
      promotion: quote.promotion && {
        code: quote.promotion.code,
        name: quote.promotion.name,
        type: quote.promotion.type,
      },
      subtotal: quote.subtotal,
      shippingFee: quote.shippingFee,
      assemblyFee: quote.assemblyFee,
      discount: quote.discount,
      total: quote.total,
      expectedDeliveryAt: quote.expectedDeliveryAt,
    };
  }

  /**
   * POST /checkout (plan mục 10). Toàn bộ chạy trong 1 transaction:
   * đọc giỏ → đọc variant + product từ DB → địa chỉ của user → kiểm tra trạng thái / tồn kho →
   * tính tiền → trừ kho (atomic) → tăng lượt dùng mã (atomic) → tạo đơn (snapshot) → xóa giỏ.
   *
   * Xóa giỏ ghi vào document cart, nên 2 lần bấm "Đặt hàng" cùng lúc sẽ xung đột: lần sau
   * chạy lại, thấy giỏ trống và bị từ chối (không tạo 2 đơn, không vượt perUserLimit).
   */
  async checkout(user: UserInfo, dto: CheckoutDto) {
    const order = await withRetry(() =>
      this.prismaService.$transaction(async (tx) => {
        const quote = await this.quote(user.userID, dto, tx);

        await this.productVariantsService.reserveStock(
          quote.lines
            .filter((l) => l.reserveStock)
            .map((l) => ({ variantID: l.variant.id, quantity: l.quantity, name: l.variant.name })),
          tx,
        );
        if (quote.promotion) await this.promotionsService.consume(quote.promotion, tx);

        const created = await this.ordersService.createInTx(
          tx,
          {
            userID: user.userID,
            items: quote.lines.map((l) => ({
              productID: l.variant.productID,
              variantID: l.variant.id,
              name: l.variant.product.name,
              variantName: l.variant.name,
              sku: l.variant.sku,
              imageUrl: pickImageUrl(l.variant),
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              lineTotal: l.lineTotal,
              assemblyFee: l.assemblyFee,
              stockReserved: l.reserveStock,
            })),
            shippingAddress: toShippingAddress(quote.address),
            note: dto.note,
            subtotal: quote.subtotal,
            shippingFee: quote.shippingFee,
            assemblyFee: quote.assemblyFee,
            discount: quote.discount,
            total: quote.total,
            promotionCode: quote.promotion?.code,
            promotionID: quote.promotion?.id,
            paymentMethod: dto.paymentMethod,
            expectedDeliveryAt: quote.expectedDeliveryAt,
          },
          user.userEmail,
        );

        await this.cartsService.clear(user.userID, tx);
        return created;
      }, CHECKOUT_TX_OPTIONS),
    );

    // Giai đoạn 4: tạo link VNPay / MoMo và gửi email xác nhận ở đây (ngoài transaction)
    return { order, paymentUrl: null };
  }

  /**
   * Tính tiền ở server, từ dữ liệu trong DB (không tin giá từ client).
   * total = subtotal + shippingFee + assemblyFee − discount
   * (mã free_shipping: discount = shippingFee, nên đơn vẫn lưu phí ship thật để đối soát).
   */
  private async quote(
    userID: string,
    dto: CheckoutPreviewDto,
    db: Prisma.TransactionClient,
  ) {
    const items = await this.cartsService.getItems(userID, db);
    if (!items.length) throw new BadRequestException('Giỏ hàng trống');

    const address = await this.addressesService.findOwned(userID, dto.addressID, db);
    if (!address) throw new NotFoundException('Không tìm thấy địa chỉ giao hàng');

    const variants = await this.productVariantsService.findForSale(
      items.map((i) => i.variantID),
      db,
    );
    const lines = buildCheckoutLines(items, variants, dto.withAssembly);
    const subtotal = sumBy(lines, (l) => l.lineTotal);
    const assemblyFee = sumBy(lines, (l) => l.assemblyFee);

    const zone = await this.shippingZonesService.findForProvince(address.province, db);
    const shippingFee = calculateShippingFee(
      zone,
      lines.map((l) => ({
        quantity: l.quantity,
        weightKg: l.variant.weightKg,
        dimensions: l.variant.dimensions,
      })),
      subtotal,
    );

    const promotion = dto.promotionCode
      ? await this.promotionsService.findApplicable(
          dto.promotionCode,
          {
            subtotal,
            countUserUsage: (promotionID) =>
              this.ordersService.countPromotionUsage(userID, promotionID, db),
          },
          db,
        )
      : null;
    const discount = promotion ? computeDiscount(promotion, subtotal, shippingFee) : 0;

    return {
      address,
      zone,
      promotion,
      lines,
      subtotal,
      shippingFee,
      assemblyFee,
      discount,
      total: subtotal + shippingFee + assemblyFee - discount,
      expectedDeliveryAt: estimateDeliveryDate(
        zone.estimatedDays,
        lines.map((l) => (l.reserveStock ? 0 : l.variant.product.leadTimeDays)),
      ),
    };
  }
}
