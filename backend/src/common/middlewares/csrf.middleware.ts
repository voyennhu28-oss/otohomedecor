import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { TokenKeys } from '../../app/auth/consts/jwt.const';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_COOKIES = Object.values(TokenKeys);

const reject = (res: Response, status: number, message: string) => {
  res
    .status(status)
    .json({ errors: [{ message }], data: null, message: 'ERROR' });
};

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

export const verifyOrigin = (allowedOrigins: string[]): RequestHandler => {
  const allowed = new Set(allowedOrigins);

  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();
    if (!AUTH_COOKIES.some((key) => req.cookies?.[key])) return next();

    const origin = req.headers.origin;
    const trusted = origin
      ? allowed.has(origin) || isSameHost(origin, req.headers.host)
      : req.headers['sec-fetch-site'] !== 'cross-site';

    if (trusted) return next();
    reject(res, 403, 'Request đến từ trang web không được phép');
  };
};

export const rejectNonJsonBody: RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const hasBody =
    req.headers['transfer-encoding'] !== undefined ||
    Number(req.headers['content-length']) > 0;
  if (hasBody && !req.is(['json', 'multipart'])) {
    return reject(
      res,
      415,
      'Chỉ nhận dữ liệu JSON (Content-Type: application/json)',
    );
  }
  next();
};
