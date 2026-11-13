import { Module } from '@nestjs/common';
import { AdminShippingZonesController } from './admin-shipping-zones.controller';
import { ShippingZonesController } from './shipping-zones.controller';
import { ShippingZonesService } from './shipping-zones.service';

@Module({
  controllers: [ShippingZonesController, AdminShippingZonesController],
  providers: [ShippingZonesService],
  exports: [ShippingZonesService], // checkout tìm vùng theo tỉnh
})
export class ShippingZonesModule {}
