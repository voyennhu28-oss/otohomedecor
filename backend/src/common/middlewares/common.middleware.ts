import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rejectNonJsonBody, verifyOrigin } from './csrf.middleware';

/**
 * App phải được tạo với `NEST_APP_OPTIONS` (bodyParser: false): ở đây chỉ bật parser JSON,
 * không nhận body urlencoded (loại form HTML cross-site gửi được). Thứ tự middleware có ý nghĩa:
 * cookieParser phải chạy trước verifyOrigin, và mọi bước kiểm tra chạy trước khi parse body.
 */
export const applyMiddlewares = (app: NestExpressApplication, allowedOrigins: string[]) => {
  app.use(helmet(), cookieParser(), verifyOrigin(allowedOrigins), rejectNonJsonBody);
  app.useBodyParser('json');
};
