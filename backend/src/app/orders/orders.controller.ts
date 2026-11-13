import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, type UserInfo } from '../../common/decorators/user.decorator';
import { CancelOrderDto, MyOrderListQueryDto, OrderNumberParamDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

/** Đơn hàng của người đang đăng nhập. userID luôn lấy từ token. */
@ApiTags('Me / Orders')
@Controller('me/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findMine(@User() user: UserInfo, @Query() query: MyOrderListQueryDto) {
    return this.ordersService.findMine(user.userID, query);
  }

  @Get(':orderNumber')
  findOne(@User() user: UserInfo, @Param() { orderNumber }: OrderNumberParamDto) {
    return this.ordersService.findMineByNumber(user.userID, orderNumber);
  }

  /** Chỉ hủy được khi đơn còn "Chờ xác nhận". */
  @Post(':orderNumber/cancel')
  @HttpCode(200)
  cancel(
    @User() user: UserInfo,
    @Param() { orderNumber }: OrderNumberParamDto,
    @Body() { reason }: CancelOrderDto,
  ) {
    return this.ordersService.cancelMine(user, orderNumber, reason);
  }
}
