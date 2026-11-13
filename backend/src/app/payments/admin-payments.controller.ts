import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { PaymentListQueryDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Admin / Payments')
@AdminOnly()
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Giao dịch SePay đã nhận. `?status=failed`: tiền đã vào nhưng không tự áp được vào đơn
   * (sai số tiền, đơn đã hủy / đã trả) → đối soát, hoàn tiền hoặc POST /admin/orders/:id/mark-paid.
   */
  @Get()
  findList(@Query() query: PaymentListQueryDto) {
    return this.paymentsService.findList(query);
  }
}
