import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, type UserInfo } from '../../common/decorators/user.decorator';
import { CheckoutService } from './checkout.service';
import { CheckoutDto, CheckoutPreviewDto } from './dto/checkout.dto';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('preview')
  @HttpCode(200)
  preview(@User() user: UserInfo, @Body() dto: CheckoutPreviewDto) {
    return this.checkoutService.preview(user, dto);
  }

  @Post()
  checkout(@User() user: UserInfo, @Body() dto: CheckoutDto) {
    return this.checkoutService.checkout(user, dto);
  }
}
