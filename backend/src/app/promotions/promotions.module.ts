import { Module } from '@nestjs/common';
import { AdminPromotionsController } from './admin-promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  controllers: [AdminPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
