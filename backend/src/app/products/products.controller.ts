import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SlugDto } from '../../common/dto/param.dto';
import {
  ProductFiltersQueryDto,
  ProductLimitQueryDto,
  ProductListQueryDto,
} from './dto/product-query.dto';
import { ProductsService } from './products.service';

/**
 * Lưu ý thứ tự route: "featured" và "filters" phải khai báo TRƯỚC ":slug",
 * nếu không Express sẽ hiểu "featured" là một slug.
 */
@ApiTags('Products')
@Public()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findList(@Query() query: ProductListQueryDto) {
    return this.productsService.findPublicList(query);
  }

  @Get('featured')
  findFeatured(@Query() { limit }: ProductLimitQueryDto) {
    return this.productsService.findFeatured(limit);
  }

  @Get('filters')
  getFilterOptions(@Query() { category }: ProductFiltersQueryDto) {
    return this.productsService.getFilterOptions(category);
  }

  @Get(':slug')
  findBySlug(@Param() { slug }: SlugDto) {
    return this.productsService.findPublicBySlug(slug);
  }

  @Get(':slug/related')
  findRelated(@Param() { slug }: SlugDto, @Query() { limit }: ProductLimitQueryDto) {
    return this.productsService.findRelated(slug, limit);
  }
}
