import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, type UserInfo } from '../../common/decorators/user.decorator';
import { CartsService } from './carts.service';
import { AddCartItemDto, CartVariantParamDto, UpdateCartItemDto } from './dto/cart.dto';

/** Giỏ hàng của người đang đăng nhập. Mọi API trả về giỏ hàng mới nhất. */
@ApiTags('Me / Cart')
@Controller('me/cart')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  getCart(@User() user: UserInfo) {
    return this.cartsService.getCart(user.userID);
  }

  @Post('items')
  addItem(@User() user: UserInfo, @Body() dto: AddCartItemDto) {
    return this.cartsService.addItem(user.userID, dto);
  }

  @Patch('items/:variantID')
  updateItem(
    @User() user: UserInfo,
    @Param() { variantID }: CartVariantParamDto,
    @Body() { quantity }: UpdateCartItemDto,
  ) {
    return this.cartsService.updateItem(user.userID, variantID, quantity);
  }

  @Delete('items/:variantID')
  removeItem(@User() user: UserInfo, @Param() { variantID }: CartVariantParamDto) {
    return this.cartsService.removeItem(user.userID, variantID);
  }

  @Delete()
  clear(@User() user: UserInfo) {
    return this.cartsService.clearCart(user.userID);
  }
}
