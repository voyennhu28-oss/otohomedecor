import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersCron {
  private readonly logger = new Logger(OrdersCron.name);
  private running = false;

  constructor(private readonly ordersService: OrdersService) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'cancel-unpaid-orders' })
  async cancelUnpaidOrders() {
    if (this.running) return;
    this.running = true;
    try {
      const cancelled = await this.ordersService.cancelExpiredUnpaid();
      if (cancelled)
        this.logger.log(
          `Đã hủy ${cancelled} đơn chuyển khoản quá hạn thanh toán`,
        );
    } catch (error) {
      this.logger.error('Cron hủy đơn quá hạn lỗi', (error as Error)?.stack);
    } finally {
      this.running = false;
    }
  }
}
