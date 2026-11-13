import { Module } from '@nestjs/common';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';

@Module({
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService], // checkout lấy địa chỉ giao hàng của user
})
export class AddressesModule {}
