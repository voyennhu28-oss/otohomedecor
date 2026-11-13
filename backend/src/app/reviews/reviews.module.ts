import { Module } from '@nestjs/common';
import { FileUtilModule } from '../../common/utils/file-util/file-util.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { AdminReviewsController } from './admin-reviews.controller';
import { ReviewImagesController } from './review-images.controller';
import { ReviewImagesService } from './review-images.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [
    ProductsModule, // kiểm tra sản phẩm, lưu ratingAvg / ratingCount
    OrdersModule, // đơn đã giao chứa sản phẩm (điều kiện viết review)
    FileUtilModule, // multer lưu file tạm + upload Cloudinary (ảnh review)
  ],
  controllers: [ReviewsController, ReviewImagesController, AdminReviewsController],
  providers: [ReviewsService, ReviewImagesService],
})
export class ReviewsModule {}
