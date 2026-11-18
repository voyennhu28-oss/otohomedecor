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

  @Get()
  findList(@Query() query: PaymentListQueryDto) {
    return this.paymentsService.findList(query);
  }
}
