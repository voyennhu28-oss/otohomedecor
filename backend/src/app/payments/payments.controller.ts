import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, type UserInfo } from '../../common/decorators/user.decorator';
import { OrderNumberParamDto } from '../orders/dto/order.dto';
import { PaymentsService } from './payments.service';

/** Thông tin thanh toán đơn của người đang đăng nhập. */
@ApiTags('Me / Orders')
@Controller('me/orders')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Thông tin chuyển khoản + QR của đơn chưa trả tiền (mở lại trang thanh toán).
   * Frontend poll GET /me/orders/:orderNumber tới khi paymentStatus = "paid".
   */
  @Get(':orderNumber/payment')
  getTransferInfo(@User() user: UserInfo, @Param() { orderNumber }: OrderNumberParamDto) {
    return this.paymentsService.getMyTransferInfo(user.userID, orderNumber);
  }
}
