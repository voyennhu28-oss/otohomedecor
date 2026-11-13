import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { IDDto } from '../../common/dto/param.dto';
import {
  AdminReviewListQueryDto,
  ReviewImageParamDto,
  UpdateReviewStatusDto,
} from './dto/review.dto';
import { ReviewImagesService } from './review-images.service';
import { ReviewsService } from './reviews.service';

@ApiTags('Admin / Reviews')
@AdminOnly()
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly reviewImagesService: ReviewImagesService,
  ) {}

  /** Mọi review (cả đang ẩn / chờ duyệt), lọc theo trạng thái, sản phẩm, số sao. */
  @Get()
  findList(@Query() query: AdminReviewListQueryDto) {
    return this.reviewsService.findAdminList(query);
  }

  /** Ẩn hoặc duyệt review. Điểm đánh giá của sản phẩm được tính lại ngay. */
  @Patch(':id/status')
  updateStatus(@Param() { id }: IDDto, @Body() { status }: UpdateReviewStatusDto) {
    return this.reviewsService.updateStatus(id, status);
  }

  /** Gỡ ảnh không phù hợp khỏi review (xóa luôn trên Cloudinary). */
  @Delete(':id/images/:publicID')
  removeImage(@Param() { id, publicID }: ReviewImageParamDto) {
    return this.reviewImagesService.removeAsAdmin(id, publicID);
  }
}
