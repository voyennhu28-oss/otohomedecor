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
   * Tất cả hoặc không: 1 ảnh upload lỗi hoặc ghi DB lỗi thì xóa các ảnh đã lên Cloudinary
   * (không để ảnh mồ côi). File tạm trên đĩa luôn bị xóa sau khi xong (kể cả khi lỗi).
   */
  async upload(productID: string, files: UploadedImage[]) {
    try {
      if (!files?.length) throw new BadRequestException('Chưa chọn ảnh nào');
      await this.productsService.findOneOrThrow(productID);

      const results = await Promise.allSettled(
        files.map(
          (file) =>
            this.fileStrategy.upload(
              this.newPublicID(productID),
              resolve(file.path),
            ) as Promise<UploadApiResponse>,
        ),
      );
      const uploaded = results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => ({ url: r.value.secure_url, publicID: r.value.public_id }));

      const failed = results.find((r) => r.status === 'rejected');
      if (failed) {
        this.destroyQuietly(uploaded.map((img) => img.publicID));
        throw failed.reason;
      }

      try {
        return await this.productsService.appendImages(productID, uploaded);
      } catch (error) {
        this.destroyQuietly(uploaded.map((img) => img.publicID));
        throw error;
      }
    } finally {
      await Promise.all((files ?? []).map((file) => unlink(file.path).catch(() => undefined)));
    }
  }

  /** Bỏ ảnh khỏi product, rồi xóa trên Cloudinary (lỗi Cloudinary chỉ ghi log, không chặn). */
  async remove(productID: string, publicID: string) {
    const images = await this.productsService.removeImage(productID, publicID);
    this.destroyQuietly([publicID]);
    return images;
  }

  /** Xóa ảnh trên Cloudinary ở nền: không chặn response, lỗi chỉ ghi log. */
  private destroyQuietly(publicIDs: string[]) {
    for (const publicID of publicIDs) {
      Promise.resolve(this.fileStrategy.remove(publicID)).catch((error: unknown) => {
        this.logger.warn(`Xóa ảnh ${publicID} trên Cloudinary thất bại: ${String(error)}`);
      });
    }
  }

  /**
   * public_id riêng cho mỗi ảnh, không dùng tên file gốc (2 sản phẩm cùng upload
   * "anh.jpg" sẽ ghi đè nhau). Không có "/" để dùng được làm tham số trên URL.
   */
  private newPublicID(productID: string) {
    return `hd-product-${productID}-${randomBytes(6).toString('hex')}`;
  }
}
