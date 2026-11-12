import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const MAX_IMAGES_PER_UPLOAD = 10;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Chỉ nhận ảnh jpg / png / webp, tối đa 5MB mỗi ảnh. */
export const IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  limits: { fileSize: MAX_IMAGE_SIZE, files: MAX_IMAGES_PER_UPLOAD },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return callback(null, true);
    callback(
      new BadRequestException(`"${file.originalname}" không phải ảnh jpg / png / webp`),
      false,
    );
  },
};
