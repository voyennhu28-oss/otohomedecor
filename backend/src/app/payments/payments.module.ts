import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { AdminPaymentsController } from './admin-payments.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SepayWebhookGuard } from './sepay-webhook.guard';
import { SepayWebhookController } from './sepay-webhook.controller';

@Module({
  imports: [OrdersModule],
  controllers: [
    SepayWebhookController,
    PaymentsController,
    AdminPaymentsController,
  ],
  providers: [PaymentsService, SepayWebhookGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
