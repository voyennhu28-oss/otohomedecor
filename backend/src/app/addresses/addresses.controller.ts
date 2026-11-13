import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, type UserInfo } from '../../common/decorators/user.decorator';
import { IDDto } from '../../common/dto/param.dto';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

/** Sổ địa chỉ của người đang đăng nhập. userID luôn lấy từ token. */
@ApiTags('Me / Addresses')
@Controller('me/addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  findMine(@User() user: UserInfo) {
    return this.addressesService.findMine(user.userID);
  }

  @Post()
  create(@User() user: UserInfo, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.userID, dto);
  }

  @Patch(':id')
  update(@User() user: UserInfo, @Param() { id }: IDDto, @Body() dto: UpdateAddressDto) {
    return this.addressesService.update(user.userID, id, dto);
  }

  @Patch(':id/default')
  setDefault(@User() user: UserInfo, @Param() { id }: IDDto) {
    return this.addressesService.setDefault(user.userID, id);
  }

  @Delete(':id')
  remove(@User() user: UserInfo, @Param() { id }: IDDto) {
    return this.addressesService.remove(user.userID, id);
  }
}
