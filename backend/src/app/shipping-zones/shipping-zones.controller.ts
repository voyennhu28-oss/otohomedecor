import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ShippingZonesService } from './shipping-zones.service';

@ApiTags('Shipping')
@Controller('shipping-zones')
export class ShippingZonesController {
  constructor(private readonly shippingZonesService: ShippingZonesService) {}

  /** Danh sách tỉnh cho form địa chỉ, kèm cờ `supported` (đang giao được). */
  @Public()
  @Get('provinces')
  listProvinces() {
    return this.shippingZonesService.listProvinces();
  }
}
