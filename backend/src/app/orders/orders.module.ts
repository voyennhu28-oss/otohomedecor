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
    ProductVariantsModule, // hoàn kho khi hủy
    ProductsModule, // cộng / trừ soldCount
    PromotionsModule, // trả lượt mã khi hủy
    ExcelUtilModule,
    MailUtilModule, // email đơn hàng (Brevo)
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, OrderNotificationService, OrdersCron],
  // checkout tạo đơn + gửi email đặt hàng; payments đánh dấu đã trả tiền; users tính tổng chi tiêu
  exports: [OrdersService, OrderNotificationService],
})
export class OrdersModule {}
