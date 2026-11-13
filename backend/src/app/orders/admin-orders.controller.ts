import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { User, type UserInfo } from '../../common/decorators/user.decorator';
import { IDDto } from '../../common/dto/param.dto';
import { XLSX_MIME_TYPE } from '../products/excel/products-excel.const';
import {
  AdminOrderListQueryDto,
  ExportOrdersDto,
  MarkPaidDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Admin / Orders')
@AdminOnly()
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Lọc theo trạng thái, khoảng ngày, mã đơn, email, phương thức / trạng thái thanh toán. */
  @Get()
  findList(@Query() query: AdminOrderListQueryDto) {
    return this.ordersService.findAdminList(query);
  }

  /** Tải file Excel, body là bộ lọc giống GET /admin/orders (bỏ trống = tất cả). */
  @Post('export')
  @HttpCode(200)
  async exportExcel(@Body() filter: ExportOrdersDto) {
    const workbook = await this.ordersService.exportExcel(filter);
    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '_');
    return new StreamableFile(Buffer.from(buffer), {
      type: XLSX_MIME_TYPE,
      disposition: `attachment; filename="orders_${date}.xlsx"`,
    });
  }

  @Get(':id')
  findOne(@Param() { id }: IDDto) {
    return this.ordersService.findAdminByID(id);
  }

  /** Chỉ cho bước chuyển hợp lệ (plan mục 11). Hủy đơn: hoàn kho + trả lượt mã giảm giá. */
  @Patch(':id/status')
  updateStatus(
    @User() admin: UserInfo,
    @Param() { id }: IDDto,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(admin, id, dto);
  }

  /**
   * Xác nhận đã nhận chuyển khoản thủ công: khách ghi sai nội dung, chuyển nhiều lần...
   * (đối soát ở GET /admin/payments?status=failed). Đơn chờ xác nhận → "Đã xác nhận".
   */
  @Post(':id/mark-paid')
  @HttpCode(200)
  markPaid(@User() admin: UserInfo, @Param() { id }: IDDto, @Body() { note }: MarkPaidDto) {
    return this.ordersService.markPaidManually(admin, id, note);
  }
}
