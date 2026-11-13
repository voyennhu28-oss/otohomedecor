import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { User, type UserInfo } from '../../common/decorators/user.decorator';
import { IDDto } from '../../common/dto/param.dto';
import {
  CreateReviewDto,
  ProductReviewParamDto,
  ReviewListQueryDto,
  UpdateReviewDto,
} from './dto/review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** Review đã duyệt của sản phẩm đang bán, phân trang, kèm thống kê số sao. */
  @Public()
  @Get('products/:productID/reviews')
  findByProduct(@Param() { productID }: ProductReviewParamDto, @Query() query: ReviewListQueryDto) {
    return this.reviewsService.findPublic(productID, query);
  }

  /** Chỉ khi có đơn đã giao chứa sản phẩm này; mỗi đơn 1 review. */
  @Post('products/:productID/reviews')
  create(
    @User() user: UserInfo,
    @Param() { productID }: ProductReviewParamDto,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user, productID, dto);
  }

  /** Chỉ chủ review. */
  @Patch('reviews/:id')
  update(@User() user: UserInfo, @Param() { id }: IDDto, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.updateMine(user.userID, id, dto);
  }

  /** Chỉ chủ review. */
  @Delete('reviews/:id')
  remove(@User() user: UserInfo, @Param() { id }: IDDto) {
    return this.reviewsService.removeMine(user.userID, id);
  }
}
