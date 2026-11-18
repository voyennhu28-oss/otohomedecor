import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, type UserInfo } from '../../common/decorators/user.decorator';
import { OrderNumberParamDto } from '../orders/dto/order.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Me / Orders')
@Controller('me/orders')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':orderNumber/payment')
  getTransferInfo(
    @User() user: UserInfo,
    @Param() { orderNumber }: OrderNumberParamDto,
  ) {
    return this.paymentsService.getMyTransferInfo(user.userID, orderNumber);
  }
}
