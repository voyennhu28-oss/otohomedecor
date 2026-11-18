import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { IDDto } from '../../common/dto/param.dto';
import { imageUploadOptions } from '../../common/utils/file-util/image-upload.const';
import type { UploadedImage } from '../../common/utils/file-util/image-upload.service';
import { CollectionImageService } from './collection-image.service';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@ApiTags('Admin / Collections')
@AdminOnly()
@Controller('admin/collections')
export class AdminCollectionsController {
  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly collectionImageService: CollectionImageService,
  ) {}

  @Get()
  findList() {
    return this.collectionsService.findAdminList();
  }

  @Get(':id')
  findOne(@Param() { id }: IDDto) {
    return this.collectionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(dto);
  }

  @Patch(':id')
  update(@Param() { id }: IDDto, @Body() dto: UpdateCollectionDto) {
    return this.collectionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IDDto) {
    return this.collectionsService.remove(id);
  }

  @Post(':id/image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', imageUploadOptions(1)))
  uploadImage(
    @Param() { id }: IDDto,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    return this.collectionImageService.upload(id, file);
  }

  @Delete(':id/image')
  removeImage(@Param() { id }: IDDto) {
    return this.collectionImageService.remove(id);
  }
}
