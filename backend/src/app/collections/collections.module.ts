import { Module } from '@nestjs/common';
import { FileUtilModule } from '../../common/utils/file-util/file-util.module';
import { StringUtilModule } from '../../common/utils/string-util/string-util.module';
import { AdminCollectionsController } from './admin-collections.controller';
import { CollectionImageService } from './collection-image.service';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';

@Module({
  // FileUtilModule: multer lưu file tạm + ImageUploadService (Cloudinary) cho ảnh bìa
  imports: [StringUtilModule, FileUtilModule],
  controllers: [CollectionsController, AdminCollectionsController],
  providers: [CollectionsService, CollectionImageService],
  exports: [CollectionsService], // products dùng để lọc theo bộ sưu tập và gán sản phẩm
})
export class CollectionsModule {}
