import { Injectable } from '@nestjs/common';
import {
  ImageUploadService,
  type UploadedImage,
} from '../../common/utils/file-util/image-upload.service';
import { CollectionsService } from './collections.service';

@Injectable()
export class CollectionImageService {
  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly imageUpload: ImageUploadService,
  ) {}

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
