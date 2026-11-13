import { Module } from '@nestjs/common';
import { ProductVariantsModule } from '../product-variants/product-variants.module';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';

@Module({
  imports: [ProductVariantsModule], // đọc giá / tồn kho hiện tại của variant
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService], // checkout đọc và xóa giỏ trong transaction
})
export class CartsModule {}
