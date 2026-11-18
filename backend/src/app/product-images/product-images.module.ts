import { Module } from '@nestjs/common';
import { FileUtilModule } from '../../common/utils/file-util/file-util.module';
import { ProductsModule } from '../products/products.module';
import { AdminProductImagesController } from './admin-product-images.controller';
import { ProductImagesService } from './product-images.service';

@Module({
  imports: [ProductsModule, FileUtilModule],
  controllers: [AdminProductImagesController],
  providers: [ProductImagesService],
})
export class ProductImagesModule {}
