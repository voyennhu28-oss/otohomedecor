import { SetMetadata } from '@nestjs/common';

export const SKIP_FORMAT_RESPONSE = 'skipFormatResponse';

/**
 * Trả nguyên giá trị controller trả về, không bọc `{ errors, data, message }`.
 * Dùng cho route mà bên gọi cần đúng một body cố định (vd webhook SePay cần `{ "success": true }`).
 * Route trả `StreamableFile` (tải file) tự được bỏ qua, không cần gắn decorator này.
 */
export const SkipFormatResponse = () => SetMetadata(SKIP_FORMAT_RESPONSE, true);
