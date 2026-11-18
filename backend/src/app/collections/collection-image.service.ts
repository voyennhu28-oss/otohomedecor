import { Injectable } from '@nestjs/common';
import {
  ImageUploadService,
  type UploadedImage,
} from '../../common/utils/file-util/image-upload.service';
import { CollectionsService } from './collections.service';

/** Ảnh bìa bộ sưu tập: mỗi bộ sưu tập 1 ảnh, upload ảnh mới thì ảnh cũ bị xóa. */
@Injectable()
export class CollectionImageService {
  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly imageUpload: ImageUploadService,
  ) {}

  /** Upload lên Cloudinary, lưu vào DB, rồi mới xóa ảnh cũ (lỗi lưu DB thì ảnh mới bị xóa). */
  async upload(id: string, file: UploadedImage | undefined) {
    const { collection, previous } = await this.imageUpload.upload(
      file ? [file] : undefined,
      {
        publicIDPrefix: `hd-collection-${id}`,
        before: () => this.collectionsService.findOne(id),
        save: ([image]) => this.collectionsService.setImage(id, image),
      },
    );
    this.imageUpload.destroyQuietly([previous?.publicID]);
    return collection;
  }

  async remove(id: string) {
    const { collection, previous } = await this.collectionsService.setImage(
      id,
      null,
    );
    this.imageUpload.destroyQuietly([previous?.publicID]);
    return collection;
  }
}
