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
    FileUtilModule, // multer lưu file Excel tạm ra đĩa để import
  ],
  controllers: [
    ProductsController,
    AdminProductsController,
    AdminCollectionProductsController, // gán / gỡ sản phẩm khỏi bộ sưu tập (ghi Product.collectionIDs)
  ],
  providers: [ProductsService, ProductsExcelService],
  exports: [ProductsService], // product-variants, product-images, wishlist, cart, checkout dùng
})
export class ProductsModule {}
