import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
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

  @Get()
  findList(@Query() query: AdminReviewListQueryDto) {
    return this.reviewsService.findAdminList(query);
  }

  @Patch(':id/status')
  updateStatus(
    @Param() { id }: IDDto,
    @Body() { status }: UpdateReviewStatusDto,
  ) {
    return this.reviewsService.updateStatus(id, status);
  }

  @Delete(':id/images/:publicID')
  removeImage(@Param() { id, publicID }: ReviewImageParamDto) {
    return this.reviewImagesService.removeAsAdmin(id, publicID);
  }
}
