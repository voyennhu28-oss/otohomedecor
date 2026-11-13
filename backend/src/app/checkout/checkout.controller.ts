import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, type UserInfo } from '../../common/decorators/user.decorator';
import { CheckoutService } from './checkout.service';
import { CheckoutDto, CheckoutPreviewDto } from './dto/checkout.dto';

/** Đặt hàng từ giỏ hàng của người đang đăng nhập. */
@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /** Bảng tính tiền (tạm tính, phí ship, lắp đặt, giảm giá, tổng), không ghi DB. */
  @Post('preview')
  @HttpCode(200)
  preview(@User() user: UserInfo, @Body() dto: CheckoutPreviewDto) {
    return this.checkoutService.preview(user, dto);
  }

  /** Tạo đơn. Thanh toán online (giai đoạn 4) sẽ trả kèm `paymentUrl`. */
  @Post()
  checkout(@User() user: UserInfo, @Body() dto: CheckoutDto) {
    return this.checkoutService.checkout(user, dto);
  }
}
