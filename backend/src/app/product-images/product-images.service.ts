import { Injectable } from '@nestjs/common';
import {
  ImageUploadService,
  type UploadedImage,
} from '../../common/utils/file-util/image-upload.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly imageUpload: ImageUploadService,
  ) {}

  /** Upload lên Cloudinary rồi thêm vào cuối danh sách ảnh của product (tất cả hoặc không). */
  upload(productID: string, files: UploadedImage[]) {
    return this.imageUpload.upload(files, {
      publicIDPrefix: `hd-product-${productID}`,
      before: () => this.productsService.findOneOrThrow(productID),
      save: (images) => this.productsService.appendImages(productID, images),
    });
  }

  /** Bỏ ảnh khỏi product, rồi xóa trên Cloudinary (lỗi Cloudinary chỉ ghi log, không chặn). */
  async remove(productID: string, publicID: string) {
    const images = await this.productsService.removeImage(productID, publicID);
    this.imageUpload.destroyQuietly([publicID]);
    return images;
  }
}
