import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { UploadApiResponse } from 'cloudinary';
import { randomBytes } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FileStrategy } from './base/file.strategy';

/** File multer đã lưu tạm trên đĩa (chỉ dùng tới path). */
export interface UploadedImage {
  path: string;
  originalname: string;
}

/** Ảnh đã lên Cloudinary. */
export interface StoredImage {
  url: string;
  publicID: string;
}

export interface UploadPlan<T> {
  /** public_id = "<prefix>-<12 ký tự hex>", không có "/" để dùng được làm tham số trên URL. */
  publicIDPrefix: string;
  /** Kiểm tra trước khi upload (quyền, giới hạn số ảnh...). Lỗi ở đây thì không upload gì. */
  before?: () => Promise<unknown>;
  /** Lưu ảnh vào DB. Lỗi ở đây thì các ảnh vừa upload bị xóa khỏi Cloudinary. */
  save: (images: StoredImage[]) => Promise<T>;
}

/** Upload ảnh lên Cloudinary (FileStrategy) cho mọi nơi: ảnh sản phẩm, ảnh review... */
@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);

  constructor(private readonly fileStrategy: FileStrategy) {}

  /**
   * Tất cả hoặc không: 1 ảnh upload lỗi hoặc `save` lỗi thì xóa các ảnh đã lên Cloudinary
   * (không để ảnh mồ côi). File tạm trên đĩa luôn bị xóa sau khi xong (kể cả khi lỗi).
   */
  async upload<T>(files: UploadedImage[] | undefined, { publicIDPrefix, before, save }: UploadPlan<T>) {
    try {
      if (!files?.length) throw new BadRequestException('Chưa chọn ảnh nào');
      await before?.();

      const images = await this.uploadAll(files, publicIDPrefix);
      try {
        return await save(images);
      } catch (error) {
        this.destroyQuietly(images.map((img) => img.publicID));
        throw error;
      }
    } finally {
      await Promise.all((files ?? []).map((file) => unlink(file.path).catch(() => undefined)));
    }
  }

  /** Xóa ảnh trên Cloudinary ở nền: không chặn response, lỗi chỉ ghi log. */
  destroyQuietly(publicIDs: (string | null | undefined)[]) {
    for (const publicID of publicIDs) {
      if (!publicID) continue;
      Promise.resolve(this.fileStrategy.remove(publicID)).catch((error: unknown) => {
        this.logger.warn(`Xóa ảnh ${publicID} trên Cloudinary thất bại: ${String(error)}`);
      });
    }
  }

  private async uploadAll(files: UploadedImage[], prefix: string): Promise<StoredImage[]> {
    const results = await Promise.allSettled(
      files.map(
        (file) =>
          this.fileStrategy.upload(
            `${prefix}-${randomBytes(6).toString('hex')}`,
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
    return uploaded;
  }
}
