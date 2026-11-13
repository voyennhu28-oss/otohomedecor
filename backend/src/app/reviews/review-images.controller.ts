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
import { User, type UserInfo } from '../../common/decorators/user.decorator';
import { IDDto } from '../../common/dto/param.dto';
import { imageUploadOptions } from '../../common/utils/file-util/image-upload.const';
import type { UploadedImage } from '../../common/utils/file-util/image-upload.service';
import { ReviewImageParamDto } from './dto/review.dto';
import { MAX_IMAGES_PER_REVIEW, ReviewImagesService } from './review-images.service';

/** Ảnh của review, chỉ chủ review. Tạo review (JSON) trước, rồi upload ảnh. */
@ApiTags('Reviews')
@Controller('reviews/:id/images')
export class ReviewImagesController {
  constructor(private readonly reviewImagesService: ReviewImagesService) {}

  /** multipart/form-data, field "files": jpg / png / webp, 5MB mỗi ảnh, tối đa 5 ảnh mỗi review. */
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', MAX_IMAGES_PER_REVIEW, imageUploadOptions(MAX_IMAGES_PER_REVIEW)),
  )
  upload(@User() user: UserInfo, @Param() { id }: IDDto, @UploadedFiles() files: UploadedImage[]) {
    return this.reviewImagesService.upload(user.userID, id, files);
  }

  @Delete(':publicID')
  remove(@User() user: UserInfo, @Param() { id, publicID }: ReviewImageParamDto) {
    return this.reviewImagesService.removeMine(user.userID, id, publicID);
  }
}
