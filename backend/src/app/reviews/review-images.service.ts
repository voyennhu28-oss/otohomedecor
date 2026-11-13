import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ImageItem, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { withRetry } from '../../common/prisma/with-retry';
import {
  ImageUploadService,
  type UploadedImage,
} from '../../common/utils/file-util/image-upload.service';

export const MAX_IMAGES_PER_REVIEW = 5;

const assertRoom = (current: number, adding: number) => {
  if (current + adding > MAX_IMAGES_PER_REVIEW) {
    throw new BadRequestException(
      `Mỗi đánh giá tối đa ${MAX_IMAGES_PER_REVIEW} ảnh (đang có ${current}, thêm ${adding})`,
    );
  }
};

/** Ảnh của review (mảng `images` nhúng trong Review). Ảnh lưu trên Cloudinary. */
@Injectable()
export class ReviewImagesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly imageUpload: ImageUploadService,
  ) {}

  /**
   * Chủ review thêm ảnh. Kiểm tra số ảnh 2 lần: trước khi upload (không upload thừa) và trong
   * transaction lúc lưu (2 lần upload song song không vượt giới hạn; vượt thì ảnh vừa upload bị xóa).
   */
  upload(userID: string, reviewID: string, files: UploadedImage[] | undefined) {
    return this.imageUpload.upload(files, {
      publicIDPrefix: `hd-review-${reviewID}`,
      before: async () => {
        const review = await this.prismaService.review.findFirst({
          where: { id: reviewID, userID },
          select: { images: true },
        });
        if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
        assertRoom(review.images.length, files!.length);
      },
      save: (images) =>
        this.updateImages(reviewID, userID, (current) => {
          assertRoom(current.length, images.length);
          const nextOrder = current.reduce((max, img) => Math.max(max, img.sortOrder + 1), 0);
          return [...current, ...images.map((img, i) => ({ ...img, alt: null, sortOrder: nextOrder + i }))];
        }),
    });
  }

  /** Chủ review gỡ ảnh. */
  removeMine(userID: string, reviewID: string, publicID: string) {
    return this.remove(reviewID, publicID, userID);
  }

  /** Admin gỡ ảnh không phù hợp (không cần là chủ review). */
  removeAsAdmin(reviewID: string, publicID: string) {
    return this.remove(reviewID, publicID);
  }

  private async remove(reviewID: string, publicID: string, userID?: string) {
    const images = await this.updateImages(reviewID, userID, (current) => {
      const remaining = current.filter((img) => img.publicID !== publicID);
      if (remaining.length === current.length) throw new NotFoundException('Đánh giá không có ảnh này');
      return remaining;
    });
    this.imageUpload.destroyQuietly([publicID]);
    return images;
  }

  /**
   * Đọc - sửa - ghi lại mảng ảnh trong transaction (Prisma không có `pull` cho composite list).
   * Có userID thì chỉ chủ review mới sửa được; review của người khác → 404.
   */
  private updateImages(
    reviewID: string,
    userID: string | undefined,
    change: (current: ImageItem[]) => ImageItem[],
  ) {
    return withRetry(() =>
      this.prismaService.$transaction(async (tx: Prisma.TransactionClient) => {
        const review = await tx.review.findFirst({
          where: { id: reviewID, ...(userID && { userID }) },
          select: { images: true },
        });
        if (!review) throw new NotFoundException('Không tìm thấy đánh giá');

        const images = change(review.images);
        await tx.review.update({ where: { id: reviewID }, data: { images: { set: images } } });
        return images;
      }),
    );
  }
}
