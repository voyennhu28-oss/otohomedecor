import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { AdminPaymentsController } from './admin-payments.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SepayWebhookGuard } from './sepay-webhook.guard';
import { SepayWebhookController } from './sepay-webhook.controller';

/** Thanh toán chuyển khoản qua SePay (plan mục 12). */
@Module({
  imports: [OrdersModule], // tìm đơn, đánh dấu đã trả tiền, gửi email
  controllers: [SepayWebhookController, PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, SepayWebhookGuard],
  exports: [PaymentsService], // checkout lấy thông tin chuyển khoản
})
export class PaymentsModule {}
