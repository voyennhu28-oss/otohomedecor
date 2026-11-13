import { Module } from '@nestjs/common';
import { ExcelUtilModule } from '../../common/utils/excel-util/excel-util.module';
import { ProductVariantsModule } from '../product-variants/product-variants.module';
import { ProductsModule } from '../products/products.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    ProductVariantsModule, // hoàn kho khi hủy
    ProductsModule, // cộng / trừ soldCount
    PromotionsModule, // trả lượt mã khi hủy
    ExcelUtilModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService], // checkout tạo đơn, users tính tổng chi tiêu
})
export class OrdersModule {}
