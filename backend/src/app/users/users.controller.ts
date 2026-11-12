import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, type UserInfo } from '../../common/decorators/user.decorator';
import { ProductIDParamDto, UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

/** Tài khoản của người đang đăng nhập. userID luôn lấy từ token. */
@ApiTags('Me')
@Controller('me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMe(@User() user: UserInfo) {
    return this.usersService.getMe(user.userID);
  }

  @Patch()
  updateMe(@User() user: UserInfo, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.userID, dto);
  }

  @Get('wishlist')
  getWishlist(@User() user: UserInfo) {
    return this.usersService.getWishlist(user.userID);
  }

  @Post('wishlist/:productID')
  addToWishlist(@User() user: UserInfo, @Param() { productID }: ProductIDParamDto) {
    return this.usersService.addToWishlist(user.userID, productID);
  }

  @Delete('wishlist/:productID')
  removeFromWishlist(@User() user: UserInfo, @Param() { productID }: ProductIDParamDto) {
    return this.usersService.removeFromWishlist(user.userID, productID);
  }
}
