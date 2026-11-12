import { Module } from '@nestjs/common';
import { StringUtilModule } from '../../common/utils/string-util/string-util.module';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [StringUtilModule],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService], // products dùng để lọc theo danh mục (gồm con cháu)
})
export class CategoriesModule {}
