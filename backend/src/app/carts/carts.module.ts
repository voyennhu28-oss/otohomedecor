import { Module } from '@nestjs/common';
import { ProductVariantsModule } from '../product-variants/product-variants.module';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';

@Module({
  imports: [ProductVariantsModule],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}
