export enum RateLimitEnvs {
  THROTTLE_TTL = 'THROTTLE_TTL',
  THROTTLE_LIMIT = 'THROTTLE_LIMIT',
}

/** Mặc định khi .env không khai báo: 100 request / 60 giây / IP. */
export const THROTTLE_DEFAULT = { ttl: 60_000, limit: 100 };

/**
 * Giới hạn chặt cho route dễ bị dò mật khẩu / spam email: 5 lần / phút / IP.
 * Dùng: @Throttle(STRICT_THROTTLE)
 */
export const STRICT_THROTTLE = { default: { ttl: 60_000, limit: 5 } };
