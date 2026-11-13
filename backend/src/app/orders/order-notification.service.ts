import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailUtilService } from '../../common/utils/mail-util/mail-util.service';
import type { TransferInfo } from '../payments/sepay.util';
import { buildOrderPlacedEmail, buildStatusEmail, MailContext, MailOrder, OrderEmail } from './order-mail';

/**
 * Email cho khách về đơn hàng (Brevo SMTP qua MailUtilService). Mọi hàm public chạy NỀN:
 * không chặn response, lỗi chỉ ghi log. Luôn gọi SAU khi transaction đã commit.
 */
@Injectable()
export class OrderNotificationService {
  private readonly logger = new Logger(OrderNotificationService.name);
  private readonly feUrl: string;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailUtilService: MailUtilService,
    config: ConfigService,
  ) {
    this.feUrl = (config.get<string>('FE_URL') ?? 'http://localhost:3000').split(',')[0].trim();
  }

  /** Sau checkout. `transfer` = thông tin chuyển khoản nếu đơn bank_transfer. */
  orderPlaced(orderID: string, transfer: TransferInfo | null = null) {
    this.dispatch(orderID, 'đặt hàng', (order, ctx) => buildOrderPlacedEmail(order, ctx, transfer));
  }

  /** Sau khi đơn đổi trạng thái. Trạng thái không cần báo (processing...) thì không gửi. */
  statusChanged(orderID: string) {
    this.dispatch(orderID, 'đổi trạng thái', buildStatusEmail);
  }

  private dispatch(
    orderID: string,
    kind: string,
    build: (order: MailOrder, ctx: MailContext) => OrderEmail | null,
  ) {
    this.send(orderID, build).catch((error: unknown) => {
      this.logger.error(
        `Gửi email ${kind} cho đơn ${orderID} thất bại`,
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  private async send(orderID: string, build: (order: MailOrder, ctx: MailContext) => OrderEmail | null) {
    // Đọc lại đơn đã commit (kèm email khách qua quan hệ user, không truy vấn thẳng module users)
    const order = await this.prismaService.order.findUnique({
      where: { id: orderID },
      include: { user: { select: { email: true, fullName: true } } },
    });
    if (!order?.user) return;

    const email = build(order, {
      customerName: order.shippingAddress.fullName || order.user.fullName,
      orderUrl: `${this.feUrl}/orders/${order.orderNumber}`,
    });
    if (email) await this.mailUtilService.send({ to: order.user.email, ...email });
  }
}
