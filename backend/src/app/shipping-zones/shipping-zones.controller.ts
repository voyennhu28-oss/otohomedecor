import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ShippingZonesService } from './shipping-zones.service';

@ApiTags('Shipping')
@Controller('shipping-zones')
export class ShippingZonesController {
  constructor(private readonly shippingZonesService: ShippingZonesService) {}

  @Public()
  @Get('provinces')
  listProvinces() {
    return this.shippingZonesService.listProvinces();
  }
}
