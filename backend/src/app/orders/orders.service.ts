import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import type { UserInfo } from '../../common/decorators/user.decorator';
import { paginate, toPage } from '../../common/dto/query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { withRetry } from '../../common/prisma/with-retry';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import { ExcelUtilService } from '../../common/utils/excel-util/excel-util.service';
import { ProductVariantsService } from '../product-variants/product-variants.service';
import { ProductsService } from '../products/products.service';
import { PromotionsService } from '../promotions/promotions.service';
import {
  AdminOrderFilter,
  AdminOrderListQueryDto,
  MyOrderListQueryDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';
import { ORDER_EXCEL_COLUMNS, toOrderExcelRows } from './order-excel';
import { OrderNotificationService } from './order-notification.service';
import { generateOrderNumber } from './order-number';
import { assertTransition, CUSTOMER_CANCELLABLE, statusTimestamp } from './order-status';

export const MAX_EXPORT_ORDERS = 5000;
/** Số đơn quá hạn xử lý mỗi lần cron chạy (còn lại để lần sau). */
const EXPIRE_BATCH_SIZE = 100;

/** Field của đơn cần để đối chiếu 1 giao dịch chuyển khoản. */
const PAYMENT_ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  total: true,
  createdAt: true,
} satisfies Prisma.OrderSelect;

export type PaymentOrder = Prisma.OrderGetPayload<{ select: typeof PAYMENT_ORDER_SELECT }>;

interface TransitionOptions {
  changedBy: string;
  note?: string;
  /** Chỉ chuyển khi đơn đang ở các trạng thái này (vd khách tự hủy: chỉ pending). */
  allowedFrom?: readonly OrderStatus[];
  /** Chỉ chuyển khi đơn CHƯA trả tiền (cron hủy đơn quá hạn: tránh hủy đơn vừa nhận tiền). */
  requireUnpaid?: boolean;
}

/** Thông tin hiển thị ở danh sách "Đơn của tôi". */
const MY_ORDER_LIST_SELECT = {
  id: true,
  orderNumber: true,
  items: true,
  total: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  expectedDeliveryAt: true,
  createdAt: true,
} satisfies Prisma.OrderSelect;

const CUSTOMER_SELECT = { select: { id: true, email: true, fullName: true, phone: true } };

export type NewOrder = Omit<
  Prisma.OrderUncheckedCreateInput,
  'orderNumber' | 'statusHistory' | 'status' | 'paymentStatus'
>;

/** Bộ lọc admin → where của Prisma. Lọc theo email qua quan hệ user. */
export const buildAdminOrderWhere = (f: AdminOrderFilter): Prisma.OrderWhereInput => ({
  ...(f.status && { status: f.status }),
  ...(f.paymentMethod && { paymentMethod: f.paymentMethod }),
  ...(f.paymentStatus && { paymentStatus: f.paymentStatus }),
  ...((f.from || f.to) && {
    createdAt: { ...(f.from && { gte: f.from }), ...(f.to && { lte: f.to }) },
  }),
  ...(f.orderNumber && { orderNumber: { contains: f.orderNumber, mode: 'insensitive' } }),
  ...(f.email && { user: { is: { email: { contains: f.email, mode: 'insensitive' } } } }),
});

@Injectable()
export class OrdersService extends PrismaBaseService<'order'> {
  private readonly logger = new Logger(OrdersService.name);
  private readonly unpaidTimeoutMinutes: number;

  constructor(
    prismaService: PrismaService,
    private readonly productVariantsService: ProductVariantsService,
    private readonly productsService: ProductsService,
    private readonly promotionsService: PromotionsService,
    private readonly excelUtilService: ExcelUtilService,
    private readonly notifications: OrderNotificationService,
    config: ConfigService,
  ) {
    super(prismaService, 'order');
    this.unpaidTimeoutMinutes = Number(config.get('ORDER_UNPAID_TIMEOUT_MINUTES') ?? 30);
  }

  // ───────────── đơn của tôi ─────────────

  async findMine(userID: string, { status, ...pagination }: MyOrderListQueryDto) {
    const where: Prisma.OrderWhereInput = { userID, ...(status && { status }) };
    const [list, totalItems] = await Promise.all([
      this.extended.findMany({
        where,
        select: MY_ORDER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        ...paginate(pagination),
      }),
      this.extended.count({ where }),
    ]);
    return toPage(list, totalItems, pagination.itemPerPage);
  }

  /** Chi tiết + lịch sử trạng thái. Đơn của người khác cũng trả 404 (không lộ mã đơn tồn tại). */
  async findMineByNumber(userID: string, orderNumber: string) {
    const order = await this.extended.findFirst({ where: { orderNumber, userID } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }

  /** Customer tự hủy: chỉ khi đơn còn "Chờ xác nhận". */
  async cancelMine(user: UserInfo, orderNumber: string, reason?: string) {
    const { id } = await this.findMineByNumber(user.userID, orderNumber);
    return this.transition(id, OrderStatus.cancelled, {
      changedBy: user.userEmail,
      note: reason,
      allowedFrom: CUSTOMER_CANCELLABLE,
    });
  }

  // ───────────── admin ─────────────

  async findAdminList({ page, itemPerPage, ...filter }: AdminOrderListQueryDto) {
    const where = buildAdminOrderWhere(filter);
    const [list, totalItems] = await Promise.all([
      this.extended.findMany({
        where,
        include: { user: CUSTOMER_SELECT },
        orderBy: { createdAt: 'desc' },
        ...paginate({ page, itemPerPage }),
      }),
      this.extended.count({ where }),
    ]);
    return toPage(list, totalItems, itemPerPage);
  }

  async findAdminByID(id: string) {
    const order = await this.extended.findUnique({
      where: { id },
      include: { user: CUSTOMER_SELECT, payments: { orderBy: { createdAt: 'desc' } } },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }

  updateStatus(admin: UserInfo, id: string, { status, note }: UpdateOrderStatusDto) {
    return this.transition(id, status, { changedBy: admin.userEmail, note });
  }

  /**
   * Admin xác nhận đã nhận tiền thủ công: khách chuyển sai nội dung nên SePay không khớp được,
   * hoặc chuyển thành nhiều lần. Đơn chờ xác nhận thì chuyển luôn sang "Đã xác nhận".
   */
  async markPaidManually(admin: UserInfo, id: string, note?: string) {
    const { order, confirmed } = await withRetry(() =>
      this.prismaService.$transaction(async (tx) => {
        const current = await tx.order.findUnique({ where: { id }, select: PAYMENT_ORDER_SELECT });
        if (!current) throw new NotFoundException('Không tìm thấy đơn hàng');
        if (current.paymentStatus === PaymentStatus.paid) {
          throw new BadRequestException('Đơn đã được thanh toán');
        }
        if (current.status === OrderStatus.cancelled || current.status === OrderStatus.returned) {
          throw new BadRequestException('Đơn đã hủy / trả hàng, không thể xác nhận thanh toán');
        }
        return this.markPaid(current, tx, {
          changedBy: admin.userEmail,
          note: note ?? 'Admin xác nhận đã nhận tiền',
        });
      }),
    );
    if (confirmed) this.notifications.statusChanged(order.id);
    return order;
  }

  async exportExcel(filter: AdminOrderFilter) {
    const orders = await this.extended.findMany({
      where: buildAdminOrderWhere(filter),
      include: { user: { select: { email: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ORDERS + 1,
    });
    if (orders.length > MAX_EXPORT_ORDERS) {
      throw new BadRequestException(
        `Tối đa ${MAX_EXPORT_ORDERS} đơn mỗi lần xuất, hãy lọc theo khoảng ngày`,
      );
    }
    return this.excelUtilService.generateExcel({
      worksheets: [
        {
          sheetName: 'Orders',
          data: toOrderExcelRows(orders),
          fieldsExtend: [...ORDER_EXCEL_COLUMNS], // không có đơn vẫn có header
        },
      ],
    });
  }

  // ───────────── dùng cho checkout / users (nhận tx) ─────────────

  /** Tạo đơn trong transaction của checkout: sinh mã đơn và dòng đầu tiên của lịch sử. */
  createInTx(tx: Prisma.TransactionClient, data: NewOrder, changedBy: string) {
    return tx.order.create({
      data: {
        ...data,
        orderNumber: generateOrderNumber(),
        status: OrderStatus.pending,
        paymentStatus: PaymentStatus.pending,
        statusHistory: [{ status: OrderStatus.pending, changedBy, at: new Date() }],
      },
    });
  }

  /** Số đơn chưa hủy của user đã dùng mã giảm giá (kiểm tra perUserLimit). */
  countPromotionUsage(
    userID: string,
    promotionID: string,
    db: Prisma.TransactionClient = this.prismaService,
  ) {
    return db.order.count({
      where: { userID, promotionID, status: { not: OrderStatus.cancelled } },
    });
  }

  /** Đơn để đối chiếu giao dịch chuyển khoản (payments dùng, trong transaction của webhook). */
  findForPayment(orderNumber: string, db: Prisma.TransactionClient = this.prismaService) {
    return db.order.findUnique({ where: { orderNumber }, select: PAYMENT_ORDER_SELECT });
  }

  /**
   * Đánh dấu đã trả tiền TRONG transaction của bên gọi (webhook SePay / admin xác nhận tay).
   * Đơn đang chờ xác nhận thì chuyển luôn sang "Đã xác nhận" và ghi lịch sử.
   * Ghi vào document đơn → 2 lần xử lý đồng thời sẽ xung đột và được chạy lại tuần tự.
   */
  async markPaid(
    order: Pick<Order, 'id' | 'status'>,
    tx: Prisma.TransactionClient,
    { changedBy, note }: { changedBy: string; note?: string },
  ) {
    const now = new Date();
    const confirmed = order.status === OrderStatus.pending;
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.paid,
        paidAt: now,
        ...(confirmed && {
          status: OrderStatus.confirmed,
          statusHistory: { push: { status: OrderStatus.confirmed, note, changedBy, at: now } },
        }),
      },
    });
    return { order: updated, confirmed };
  }

  /**
   * Cron: hủy đơn chuyển khoản chưa nhận tiền quá ORDER_UNPAID_TIMEOUT_MINUTES (hoàn kho, trả lượt mã).
   * Mỗi đơn 1 transaction riêng; đơn vừa được thanh toán / đổi trạng thái giữa chừng thì bỏ qua.
   * @returns số đơn đã hủy
   */
  async cancelExpiredUnpaid(now = new Date()) {
    const deadline = new Date(now.getTime() - this.unpaidTimeoutMinutes * 60_000);
    const expired = await this.extended.findMany({
      where: {
        paymentMethod: PaymentMethod.bank_transfer,
        status: OrderStatus.pending,
        paymentStatus: PaymentStatus.pending,
        createdAt: { lt: deadline },
      },
      select: { id: true, orderNumber: true },
      orderBy: { createdAt: 'asc' },
      take: EXPIRE_BATCH_SIZE,
    });

    let cancelled = 0;
    for (const { id, orderNumber } of expired) {
      try {
        await this.transition(id, OrderStatus.cancelled, {
          changedBy: 'system',
          note: `Quá ${this.unpaidTimeoutMinutes} phút chưa nhận được chuyển khoản`,
          allowedFrom: [OrderStatus.pending],
          requireUnpaid: true,
        });
        cancelled++;
      } catch (error) {
        // HttpException: đơn vừa được thanh toán / đổi trạng thái → bỏ qua là đúng
        if (!(error instanceof HttpException)) {
          this.logger.error(`Hủy đơn quá hạn ${orderNumber} thất bại`, (error as Error)?.stack);
        }
      }
    }
    return cancelled;
  }

  /** Tổng chi tiêu: chỉ tính đơn đã giao (tiền đã thực sự trả). */
  async totalSpent(userID: string) {
    const result = await this.extended.aggregate({
      where: { userID, status: OrderStatus.delivered },
      _sum: { total: true },
    });
    return result._sum.total ?? 0;
  }

  // ───────────── chuyển trạng thái ─────────────

  /**
   * Chuyển trạng thái + tác dụng phụ trong CÙNG 1 transaction (plan mục 11):
   *  - cancelled: hoàn kho các dòng đã trừ kho, trả lại 1 lượt mã giảm giá, đã trả tiền → refunded
   *  - delivered: cộng soldCount; COD thì coi như đã thu tiền (paid)
   *  - returned: trừ lại soldCount; đã trả tiền → refunded. KHÔNG tự cộng kho
   *    (hàng trả về cần kiểm tra, admin nhập kho bằng PATCH /admin/variants/:id/stock)
   *
   * Đọc và ghi cùng document đơn trong transaction: 2 request đổi trạng thái cùng lúc thì
   * request sau xung đột, chạy lại, đọc trạng thái mới và bị từ chối (không hoàn kho 2 lần).
   * Commit xong thì gửi email cho khách (chạy nền).
   */
  private async transition(id: string, to: OrderStatus, opts: TransitionOptions) {
    const updated = await withRetry(() =>
      this.prismaService.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id },
          select: {
            status: true,
            items: true,
            promotionID: true,
            paymentMethod: true,
            paymentStatus: true,
          },
        });
        if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
        if (opts.allowedFrom && !opts.allowedFrom.includes(order.status)) {
          throw new BadRequestException('Đơn đã được xác nhận, không thể tự hủy. Vui lòng liên hệ shop');
        }
        if (opts.requireUnpaid && order.paymentStatus === PaymentStatus.paid) {
          throw new BadRequestException('Đơn đã được thanh toán');
        }
        assertTransition(order.status, to);

        const now = new Date();
        const data: Prisma.OrderUpdateInput = {
          status: to,
          statusHistory: { push: { status: to, note: opts.note, changedBy: opts.changedBy, at: now } },
          ...statusTimestamp(to, now),
        };
        const isPaid = order.paymentStatus === PaymentStatus.paid;

        switch (to) {
          case OrderStatus.cancelled:
            await this.productVariantsService.restoreStock(
              order.items.filter((i) => i.stockReserved),
              tx,
            );
            if (order.promotionID) await this.promotionsService.release(order.promotionID, tx);
            data.cancelReason = opts.note ?? null;
            if (isPaid) data.paymentStatus = PaymentStatus.refunded;
            break;
          case OrderStatus.delivered:
            await this.productsService.addSoldCount(order.items, tx);
            if (order.paymentMethod === PaymentMethod.cod && !isPaid) {
              data.paymentStatus = PaymentStatus.paid;
              data.paidAt = now;
            }
            break;
          case OrderStatus.returned:
            await this.productsService.addSoldCount(
              order.items.map((i) => ({ productID: i.productID, quantity: -i.quantity })),
              tx,
            );
            if (isPaid) data.paymentStatus = PaymentStatus.refunded;
            break;
        }

        return tx.order.update({ where: { id }, data });
      }),
    );
    this.notifications.statusChanged(updated.id);
    return updated;
  }
}
