import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersCron {
  private readonly logger = new Logger(OrdersCron.name);
  private running = false;

  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Mỗi 5 phút: hủy đơn chuyển khoản (SePay) chưa nhận tiền quá ORDER_UNPAID_TIMEOUT_MINUTES.
   * Chạy nhiều instance cùng lúc vẫn an toàn: mỗi đơn hủy trong transaction, lần thứ 2 bị từ chối.
   */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'cancel-unpaid-orders' })
  async cancelUnpaidOrders() {
    if (this.running) return; // lần trước chưa xong (DB chậm) thì bỏ qua lần này
    this.running = true;
    try {
      const cancelled = await this.ordersService.cancelExpiredUnpaid();
      if (cancelled) this.logger.log(`Đã hủy ${cancelled} đơn chuyển khoản quá hạn thanh toán`);
    } catch (error) {
      this.logger.error('Cron hủy đơn quá hạn lỗi', (error as Error)?.stack);
    } finally {
      this.running = false;
    }
  }
}
