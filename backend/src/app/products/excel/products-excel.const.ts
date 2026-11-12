import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Chỉ nhận file .xlsx, tối đa 5MB. */
export const EXCEL_UPLOAD_OPTIONS: MulterOptions = {
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (file.originalname.toLowerCase().endsWith('.xlsx')) return callback(null, true);
    callback(new BadRequestException('Chỉ nhận file .xlsx'), false);
  },
};
