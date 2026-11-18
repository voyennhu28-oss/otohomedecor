import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SlugDto } from '../../common/dto/param.dto';
import { CollectionsService } from './collections.service';
import { CollectionListQueryDto } from './dto/collection.dto';

@ApiTags('Collections')
@Public()
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  findList(@Query() { featured }: CollectionListQueryDto) {
    return this.collectionsService.findPublicList(featured);
  }

  @Get(':slug')
  findBySlug(@Param() { slug }: SlugDto) {
    return this.collectionsService.findPublicBySlug(slug);
  }
}
