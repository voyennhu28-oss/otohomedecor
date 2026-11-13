import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { ProductVariantsModule } from '../product-variants/product-variants.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { DashboardService } from './dashboard.service';

/** Chỉ có phía admin, không có collection riêng. */
@Module({
  imports: [OrdersModule, ProductVariantsModule, PaymentsModule],
  controllers: [AdminDashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
