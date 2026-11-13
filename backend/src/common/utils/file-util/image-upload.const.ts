import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
// Không nhận SVG (có thể chứa script) và GIF
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Multer cho upload ảnh: chỉ jpg / png / webp, tối đa 5MB mỗi ảnh, tối đa `maxFiles` ảnh mỗi lần. */
export const imageUploadOptions = (maxFiles: number): MulterOptions => ({
  limits: { fileSize: MAX_IMAGE_SIZE, files: maxFiles },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return callback(null, true);
    callback(
      new BadRequestException(`"${file.originalname}" không phải ảnh jpg / png / webp`),
      false,
    );
  },
});
