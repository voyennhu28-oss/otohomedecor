import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { UploadApiResponse } from 'cloudinary';
import { randomBytes } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FileStrategy } from '../../common/utils/file-util/base/file.strategy';
import { ProductsService } from '../products/products.service';

/** File multer đã lưu tạm trên đĩa (chỉ dùng tới path). */
export interface UploadedImage {
  path: string;
  originalname: string;
}

@Injectable()
export class ProductImagesService {
  private readonly logger = new Logger(ProductImagesService.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly fileStrategy: FileStrategy, // CloudinaryStrategy
  ) {}

  /**
   * Upload ảnh lên Cloudinary rồi thêm vào cuối danh sách ảnh của product.
   * File tạm trên đĩa luôn bị xóa sau khi xong (kể cả khi lỗi).
   */
  async upload(productID: string, files: UploadedImage[]) {
    try {
      if (!files?.length) throw new BadRequestException('Chưa chọn ảnh nào');
      await this.productsService.findOneOrThrow(productID);

      const uploaded: UploadApiResponse[] = await Promise.all(
        files.map((file) =>
          this.fileStrategy.upload(this.newPublicID(productID), resolve(file.path)),
        ),
      );

      return this.productsService.appendImages(
        productID,
        uploaded.map((result) => ({ url: result.secure_url, publicID: result.public_id })),
      );
    } finally {
      await Promise.all((files ?? []).map((file) => unlink(file.path).catch(() => undefined)));
    }
  }

  /** Bỏ ảnh khỏi product, rồi xóa trên Cloudinary (lỗi Cloudinary chỉ ghi log, không chặn). */
  async remove(productID: string, publicID: string) {
    const images = await this.productsService.removeImage(productID, publicID);
    this.fileStrategy.remove(publicID).catch((error: unknown) => {
      this.logger.warn(`Xóa ảnh ${publicID} trên Cloudinary thất bại: ${String(error)}`);
    });
    return images;
  }

  /**
   * public_id riêng cho mỗi ảnh, không dùng tên file gốc (2 sản phẩm cùng upload
   * "anh.jpg" sẽ ghi đè nhau). Không có "/" để dùng được làm tham số trên URL.
   */
  private newPublicID(productID: string) {
    return `hd-product-${productID}-${randomBytes(6).toString('hex')}`;
  }
}
