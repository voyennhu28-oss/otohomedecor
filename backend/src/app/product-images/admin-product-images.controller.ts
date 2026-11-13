import {
  Controller,
  Delete,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { objectId } from '../../common/dto/param.dto';
import { IMAGE_UPLOAD_OPTIONS, MAX_IMAGES_PER_UPLOAD } from './product-images.const';
import type { UploadedImage } from '../../common/utils/file-util/image-upload.service';
import { ProductImagesService } from './product-images.service';

class ProductIDParamDto extends createZodDto(z.object({ productID: objectId })) {}

class ProductImageParamDto extends createZodDto(
  z.object({ productID: objectId, publicID: z.string().min(1).max(200) }),
) {}

@ApiTags('Admin / Product images')
@AdminOnly()
@Controller('admin/products/:productID/images')
export class AdminProductImagesController {
  constructor(private readonly imagesService: ProductImagesService) {}

  /** multipart/form-data, field "files" (chọn được nhiều ảnh). */
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', MAX_IMAGES_PER_UPLOAD, IMAGE_UPLOAD_OPTIONS))
  upload(@Param() { productID }: ProductIDParamDto, @UploadedFiles() files: UploadedImage[]) {
    return this.imagesService.upload(productID, files);
  }

  @Delete(':publicID')
  remove(@Param() { productID, publicID }: ProductImageParamDto) {
    return this.imagesService.remove(productID, publicID);
  }
}
