import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { IDDto } from '../../common/dto/param.dto';
import { CreateShippingZoneDto, UpdateShippingZoneDto } from './dto/shipping-zone.dto';
import { ShippingZonesService } from './shipping-zones.service';

@ApiTags('Admin / Shipping zones')
@AdminOnly()
@Controller('admin/shipping-zones')
export class AdminShippingZonesController {
  constructor(private readonly shippingZonesService: ShippingZonesService) {}

  @Get()
  findAll() {
    return this.shippingZonesService.findAll();
  }

  @Get(':id')
  findOne(@Param() { id }: IDDto) {
    return this.shippingZonesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateShippingZoneDto) {
    return this.shippingZonesService.create(dto);
  }

  @Patch(':id')
  update(@Param() { id }: IDDto, @Body() dto: UpdateShippingZoneDto) {
    return this.shippingZonesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IDDto) {
    return this.shippingZonesService.remove(id);
  }
}
