import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { UploadApiResponse } from 'cloudinary';
import { randomBytes } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FileStrategy } from './base/file.strategy';

export interface UploadedImage {
  path: string;
  originalname: string;
}

export interface StoredImage {
  url: string;
  publicID: string;
}

export interface UploadPlan<T> {
  publicIDPrefix: string;
  before?: () => Promise<unknown>;
  save: (images: StoredImage[]) => Promise<T>;
}

@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);

  constructor(private readonly fileStrategy: FileStrategy) {}

  async upload<T>(
    files: UploadedImage[] | undefined,
    { publicIDPrefix, before, save }: UploadPlan<T>,
  ) {
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
      await Promise.all(
        (files ?? []).map((file) => unlink(file.path).catch(() => undefined)),
      );
    }
  }

  destroyQuietly(publicIDs: (string | null | undefined)[]) {
    for (const publicID of publicIDs) {
      if (!publicID) continue;
      Promise.resolve(this.fileStrategy.remove(publicID)).catch(
        (error: unknown) => {
          this.logger.warn(
            `Xóa ảnh ${publicID} trên Cloudinary thất bại: ${String(error)}`,
          );
        },
      );
    }
  }

  private async uploadAll(
    files: UploadedImage[],
    prefix: string,
  ): Promise<StoredImage[]> {
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
