import { Module } from '@nestjs/common';
import { ExcelUtilModule } from '../../common/utils/excel-util/excel-util.module';
import { FileUtilModule } from '../../common/utils/file-util/file-util.module';
import { StringUtilModule } from '../../common/utils/string-util/string-util.module';
import { CategoriesModule } from '../categories/categories.module';
import { AdminProductsController } from './admin-products.controller';
import { ProductsExcelService } from './excel/products-excel.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    CategoriesModule,
    StringUtilModule,
    ExcelUtilModule,
    FileUtilModule, // multer lưu file Excel tạm ra đĩa để import
  ],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, ProductsExcelService],
  exports: [ProductsService], // product-variants, product-images, wishlist, cart, checkout dùng
})
export class ProductsModule {}
