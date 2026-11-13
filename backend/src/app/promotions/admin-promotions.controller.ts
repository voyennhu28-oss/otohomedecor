import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { IDDto } from '../../common/dto/param.dto';
import {
  CreatePromotionDto,
  PromotionListQueryDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';
import { PromotionsService } from './promotions.service';

@ApiTags('Admin / Promotions')
@AdminOnly()
@Controller('admin/promotions')
export class AdminPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  findList(@Query() query: PromotionListQueryDto) {
    return this.promotionsService.findList(query);
  }

  @Get(':id')
  findOne(@Param() { id }: IDDto) {
    return this.promotionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Patch(':id')
  update(@Param() { id }: IDDto, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IDDto) {
    return this.promotionsService.remove(id);
  }
}
