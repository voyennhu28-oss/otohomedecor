import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { TokenKeys } from '../../app/auth/consts/jwt.const';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_COOKIES = Object.values(TokenKeys);

/** Trả lỗi cùng format với CatchEverythingFilter (middleware Express chạy ngoài filter của Nest). */
const reject = (res: Response, status: number, message: string) => {
  res.status(status).json({ errors: [{ message }], data: null, message: 'ERROR' });
};

/** "https://a.com/, http://b.com" → ["https://a.com", "http://b.com"]. Bỏ qua giá trị không phải URL. */
export const parseOrigins = (value = ''): string[] =>
  value
    .split(',')
    .map((url) => {
      try {
        return new URL(url.trim()).origin;
      } catch {
        return undefined;
      }
    })
    .filter((origin): origin is string => origin !== undefined);

const isSameHost = (origin: string, host?: string) => {
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

/**
 * Chống CSRF: request ghi dữ liệu (POST/PUT/PATCH/DELETE) có mang cookie đăng nhập thì phải đến
 * từ frontend (FE_URL) hoặc từ chính API (Swagger). Trình duyệt luôn gửi header `Origin` với
 * request ghi cross-origin và trang web khác không sửa được header này.
 *
 * Chỉ kiểm tra request dùng cookie: client gửi `Authorization: Bearer` (mobile, Postman) và
 * webhook server-to-server không bị CSRF nên không bị ảnh hưởng.
 */
export const verifyOrigin = (allowedOrigins: string[]): RequestHandler => {
  const allowed = new Set(allowedOrigins);

  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();
    if (!AUTH_COOKIES.some((key) => req.cookies?.[key])) return next();

    const origin = req.headers.origin;
    const trusted = origin
      ? allowed.has(origin) || isSameHost(origin, req.headers.host)
      : // Không có Origin (trình duyệt rất cũ / client không phải trình duyệt): dựa vào Sec-Fetch-Site
        req.headers['sec-fetch-site'] !== 'cross-site';

    if (trusted) return next();
    reject(res, 403, 'Request đến từ trang web không được phép');
  };
};

/**
 * Chỉ nhận body JSON (và multipart cho route upload). Form HTML gửi được
 * `application/x-www-form-urlencoded` / `text/plain` sang site khác mà không cần preflight CORS,
 * nên chặn hẳn 2 loại này (415).
 */
export const rejectNonJsonBody: RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  // fetch(url, { method: 'POST' }) không body vẫn gửi "Content-Length: 0" và không có Content-Type
  // (vd logout, refresh-token chỉ dùng cookie) → coi là không có body, cho qua
  const hasBody =
    req.headers['transfer-encoding'] !== undefined || Number(req.headers['content-length']) > 0;
  if (hasBody && !req.is(['json', 'multipart'])) {
    return reject(res, 415, 'Chỉ nhận dữ liệu JSON (Content-Type: application/json)');
  }
  next();
};
