import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { ProductVariantsService } from '../product-variants/product-variants.service';
import { fillDaily, listVnDates, resolveRange } from './dashboard-range';
import { DashboardQueryDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly productVariantsService: ProductVariantsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async getOverview({
    from,
    to,
    lowStockThreshold,
    topLimit,
  }: DashboardQueryDto) {
    const range = resolveRange(from, to);
    const [report, pendingOrders, failedPayments, lowStock] = await Promise.all(
      [
        this.ordersService.salesReport(range, topLimit),
        this.ordersService.countPending(),
        this.paymentsService.countFailed(range),
        this.productVariantsService.findLowStock(lowStockThreshold, 20),
      ],
    );

    const revenue = report.daily.reduce((sum, d) => sum + d.revenue, 0);
    const orders = report.daily.reduce((sum, d) => sum + d.orders, 0);

    return {
      range,
      summary: {
        revenue,
        orders,
        averageOrderValue: orders ? Math.round(revenue / orders) : 0,
        cancelledOrders: report.byStatus.cancelled,
      },
      revenueByDay: fillDaily(listVnDates(range.from, range.to), report.daily),
      ordersByStatus: report.byStatus,
      topProducts: report.topProducts,
      needsAttention: {
        pendingOrders,
        failedPayments,
        lowStockThreshold,
        lowStock,
      },
    };
  }
}
