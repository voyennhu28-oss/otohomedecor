import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const imageUploadOptions = (maxFiles: number): MulterOptions => ({
  limits: { fileSize: MAX_IMAGE_SIZE, files: maxFiles },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return callback(null, true);
    callback(
      new BadRequestException(
        `"${file.originalname}" không phải ảnh jpg / png / webp`,
      ),
      false,
    );
  },
});
