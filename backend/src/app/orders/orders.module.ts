import { Module } from '@nestjs/common';
import { ExcelUtilModule } from '../../common/utils/excel-util/excel-util.module';
import { MailUtilModule } from '../../common/utils/mail-util/mail-util.module';
import { ProductVariantsModule } from '../product-variants/product-variants.module';
import { ProductsModule } from '../products/products.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrderNotificationService } from './order-notification.service';
import { OrdersController } from './orders.controller';
import { OrdersCron } from './orders.cron';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    ProductVariantsModule,
    ProductsModule,
    PromotionsModule,
    ExcelUtilModule,
    MailUtilModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, OrderNotificationService, OrdersCron],
  exports: [OrdersService, OrderNotificationService],
})
export class OrdersModule {}
