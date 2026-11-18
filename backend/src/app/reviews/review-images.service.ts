import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class ReviewImagesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly imageUpload: ImageUploadService,
  ) {}

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
          const nextOrder = current.reduce(
            (max, img) => Math.max(max, img.sortOrder + 1),
            0,
          );
          return [
            ...current,
            ...images.map((img, i) => ({
              ...img,
              alt: null,
              sortOrder: nextOrder + i,
            })),
          ];
        }),
    });
  }

  removeMine(userID: string, reviewID: string, publicID: string) {
    return this.remove(reviewID, publicID, userID);
  }

  removeAsAdmin(reviewID: string, publicID: string) {
    return this.remove(reviewID, publicID);
  }

  private async remove(reviewID: string, publicID: string, userID?: string) {
    const images = await this.updateImages(reviewID, userID, (current) => {
      const remaining = current.filter((img) => img.publicID !== publicID);
      if (remaining.length === current.length)
        throw new NotFoundException('Đánh giá không có ảnh này');
      return remaining;
    });
    this.imageUpload.destroyQuietly([publicID]);
    return images;
  }

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
        await tx.review.update({
          where: { id: reviewID },
          data: { images: { set: images } },
        });
        return images;
      }),
    );
  }
}
