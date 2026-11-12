import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SlugDto } from '../../common/dto/param.dto';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@Public()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  getTree() {
    return this.categoriesService.getPublicTree();
  }

  @Get(':slug')
  getBySlug(@Param() { slug }: SlugDto) {
    return this.categoriesService.getPublicBySlug(slug);
  }
}
