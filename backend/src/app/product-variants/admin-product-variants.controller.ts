import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import {
  CreateVariantDto,
  ProductIDParamDto,
  ProductVariantParamDto,
  UpdateStockDto,
  UpdateVariantDto,
  VariantIDParamDto,
} from './dto/variant.dto';
import { ProductVariantsService } from './product-variants.service';

@ApiTags('Admin / Product variants')
@AdminOnly()
@Controller('admin')
export class AdminProductVariantsController {
  constructor(private readonly variantsService: ProductVariantsService) {}

  @Get('products/:productID/variants')
  findByProduct(@Param() { productID }: ProductIDParamDto) {
    return this.variantsService.findByProduct(productID);
  }

  @Post('products/:productID/variants')
  create(@Param() { productID }: ProductIDParamDto, @Body() dto: CreateVariantDto) {
    return this.variantsService.create(productID, dto);
  }

  @Patch('products/:productID/variants/:variantID')
  update(
    @Param() { productID, variantID }: ProductVariantParamDto,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.variantsService.update(productID, variantID, dto);
  }

  @Delete('products/:productID/variants/:variantID')
  remove(@Param() { productID, variantID }: ProductVariantParamDto) {
    return this.variantsService.remove(productID, variantID);
  }

  @Patch('variants/:variantID/stock')
  updateStock(@Param() { variantID }: VariantIDParamDto, @Body() dto: UpdateStockDto) {
    return this.variantsService.updateStock(variantID, dto);
  }
}
