import { Module } from '@nestjs/common';
import { ExcelUtilModule } from '../../common/utils/excel-util/excel-util.module';
import { FileUtilModule } from '../../common/utils/file-util/file-util.module';
import { StringUtilModule } from '../../common/utils/string-util/string-util.module';
import { CategoriesModule } from '../categories/categories.module';
import { CollectionsModule } from '../collections/collections.module';
import { AdminCollectionProductsController } from './admin-collection-products.controller';
import { AdminProductsController } from './admin-products.controller';
import { ProductsExcelService } from './excel/products-excel.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    CategoriesModule,
    CollectionsModule,
    StringUtilModule,
    ExcelUtilModule,
    FileUtilModule,
  ],
  controllers: [
    ProductsController,
    AdminProductsController,
    AdminCollectionProductsController,
  ],
  providers: [ProductsService, ProductsExcelService],
  exports: [ProductsService],
})
export class ProductsModule {}
