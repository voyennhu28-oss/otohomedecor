import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { paginate, toPage } from '../../common/dto/query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { withRetry } from '../../common/prisma/with-retry';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import { OrderNotificationService } from '../orders/order-notification.service';
import { findOrderNumberInText } from '../orders/order-number';
import { OrdersService } from '../orders/orders.service';
import { PaymentListQueryDto, SepayWebhookDto } from './dto/payment.dto';
import {
  buildTransferInfo,
  evaluateTransfer,
  SepayAccount,
  TransferInfo,
  TransferOutcome,
} from './sepay.util';

/** Kết quả xử lý 1 webhook. Mọi trường hợp đều trả { success: true } cho SePay. */
export type WebhookResult =
  | { outcome: TransferOutcome; orderNumber: string }
  | { outcome: 'ignored'; reason: 'not_incoming' | 'other_account' | 'no_order_code' | 'order_not_found' }
  | { outcome: 'duplicate' };

/** Giao dịch không tự áp được vào đơn: admin cần đối soát / hoàn tiền (GET /admin/payments?status=failed). */
const NEEDS_ADMIN: Record<Exclude<TransferOutcome, 'paid'>, string> = {
  amount_mismatch: 'số tiền không khớp tổng đơn',
  already_paid: 'đơn đã được thanh toán trước đó (khách chuyển trùng)',
  order_closed: 'đơn đã hủy / trả hàng (cần hoàn tiền)',
};

@Injectable()
export class PaymentsService extends PrismaBaseService<'payment'> {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly account: SepayAccount | null;
  private readonly unpaidTimeoutMinutes: number;

  constructor(
    prismaService: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly notifications: OrderNotificationService,
    config: ConfigService,
  ) {
    super(prismaService, 'payment');
    const bank = config.get<string>('SEPAY_BANK');
    const accountNumber = config.get<string>('SEPAY_ACCOUNT_NUMBER');
    this.account =
      bank && accountNumber
        ? { bank, accountNumber, accountName: config.get<string>('SEPAY_ACCOUNT_NAME') ?? null }
        : null;
    this.unpaidTimeoutMinutes = Number(config.get('ORDER_UNPAID_TIMEOUT_MINUTES') ?? 30);
  }

  // ───────────── thông tin chuyển khoản ─────────────

  /** Gọi TRƯỚC khi tạo đơn bank_transfer: chưa cấu hình tài khoản nhận tiền thì không cho đặt. */
  assertTransferAvailable() {
    if (!this.account) {
      throw new ServiceUnavailableException('Shop chưa hỗ trợ chuyển khoản, vui lòng chọn COD');
    }
  }

  transferInfo(order: Pick<Order, 'orderNumber' | 'total' | 'createdAt'>): TransferInfo {
    this.assertTransferAvailable();
    return buildTransferInfo(this.account!, order, this.unpaidTimeoutMinutes);
  }

  /** GET /me/orders/:orderNumber/payment: chỉ đơn chuyển khoản đang chờ tiền. */
  async getMyTransferInfo(userID: string, orderNumber: string) {
    const order = await this.ordersService.findMineByNumber(userID, orderNumber);
    if (order.paymentMethod !== PaymentMethod.bank_transfer) {
      throw new BadRequestException('Đơn này không thanh toán bằng chuyển khoản');
    }
    if (order.paymentStatus === PaymentStatus.paid) throw new BadRequestException('Đơn đã được thanh toán');
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException('Đơn không còn chờ thanh toán');
    }
    return this.transferInfo(order);
  }

  // ───────────── webhook SePay ─────────────

  /**
   * Xử lý 1 giao dịch SePay báo về (API key đã được SepayApiKeyGuard kiểm tra).
   * Trong 1 transaction: tìm đơn → đối chiếu → lưu Payment (transactionID @unique chặn trùng)
   * → khớp thì đánh dấu đơn đã trả tiền. Chỉ ném lỗi khi lỗi hệ thống (để SePay gửi lại).
   */
  async handleSepayWebhook(payload: SepayWebhookDto): Promise<WebhookResult> {
    const transactionID = String(payload.id);

    if (payload.transferType !== 'in') return { outcome: 'ignored', reason: 'not_incoming' };
    if (this.account && payload.accountNumber && payload.accountNumber !== this.account.accountNumber) {
      return this.ignore(transactionID, 'other_account');
    }
    // `code` là mã SePay nhận diện theo cấu hình; không có thì tự tìm trong nội dung chuyển khoản
    const orderNumber = findOrderNumberInText(payload.code) ?? findOrderNumberInText(payload.content);
    if (!orderNumber) return this.ignore(transactionID, 'no_order_code');

    let processed: { result: WebhookResult; confirmedOrderID: string | null };
    try {
      processed = await withRetry(() =>
        this.prismaService.$transaction(async (tx) => {
          const order = await this.ordersService.findForPayment(orderNumber, tx);
          if (!order) {
            return { result: { outcome: 'ignored', reason: 'order_not_found' } as const, confirmedOrderID: null };
          }

          const outcome = evaluateTransfer(order, payload.transferAmount);
          await tx.payment.create({
            data: {
              orderID: order.id,
              method: PaymentMethod.bank_transfer,
              amount: payload.transferAmount,
              status: outcome === 'paid' ? PaymentStatus.paid : PaymentStatus.failed,
              transactionID,
              rawResponse: payload as Prisma.InputJsonObject,
            },
          });
          let confirmedOrderID: string | null = null;
          if (outcome === 'paid') {
            const { confirmed } = await this.ordersService.markPaid(order, tx, {
              changedBy: 'sepay',
              note: ['Nhận chuyển khoản', payload.gateway, `#${transactionID}`].filter(Boolean).join(' '),
            });
            if (confirmed) confirmedOrderID = order.id;
          }
          return { result: { outcome, orderNumber }, confirmedOrderID };
        }),
      );
    } catch (error) {
      // transactionID đã có: SePay gửi lại giao dịch đã xử lý → bỏ qua, vẫn báo thành công
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { outcome: 'duplicate' };
      }
      throw error;
    }

    const { result, confirmedOrderID } = processed;
    if (result.outcome === 'ignored') return this.ignore(transactionID, result.reason, orderNumber);
    if (result.outcome !== 'paid' && result.outcome !== 'duplicate') {
      this.logger.warn(
        `SePay #${transactionID}: nhận ${payload.transferAmount}đ cho đơn ${orderNumber} nhưng ${NEEDS_ADMIN[result.outcome]}. Cần admin xử lý`,
      );
    }
    if (confirmedOrderID) this.notifications.statusChanged(confirmedOrderID);
    return result;
  }

  // ───────────── admin ─────────────

  async findList({ status, orderNumber, ...pagination }: PaymentListQueryDto) {
    const where: Prisma.PaymentWhereInput = {
      ...(status && { status }),
      ...(orderNumber && {
        order: { is: { orderNumber: { contains: orderNumber, mode: 'insensitive' } } },
      }),
    };
    const [list, totalItems] = await Promise.all([
      this.extended.findMany({
        where,
        include: {
          order: { select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...paginate(pagination),
      }),
      this.extended.count({ where }),
    ]);
    return toPage(list, totalItems, pagination.itemPerPage);
  }

  /**
   * Dashboard: số giao dịch tiền vào không áp được vào đơn trong khoảng thời gian (cần đối soát).
   * Đếm theo khoảng vì Payment "failed" không có trạng thái "đã xử lý".
   */
  countFailed({ from, to }: { from: Date; to: Date }) {
    return this.extended.count({
      where: { status: PaymentStatus.failed, createdAt: { gte: from, lte: to } },
    });
  }

  // ───────────── helpers ─────────────

  private ignore(
    transactionID: string,
    reason: Extract<WebhookResult, { outcome: 'ignored' }>['reason'],
    orderNumber?: string,
  ): WebhookResult {
    this.logger.log(`SePay #${transactionID}: bỏ qua (${reason}${orderNumber ? `, ${orderNumber}` : ''})`);
    return { outcome: 'ignored', reason };
  }
}
