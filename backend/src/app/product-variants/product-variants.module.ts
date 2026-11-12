import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { AdminProductVariantsController } from './admin-product-variants.controller';
import { ProductVariantsService } from './product-variants.service';

@Module({
  imports: [ProductsModule],
  controllers: [AdminProductVariantsController],
  providers: [ProductVariantsService],
  exports: [ProductVariantsService],
})
export class ProductVariantsModule {}
