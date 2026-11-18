export enum RateLimitEnvs {
  THROTTLE_TTL = 'THROTTLE_TTL',
  THROTTLE_LIMIT = 'THROTTLE_LIMIT',
}

export const THROTTLE_DEFAULT = { ttl: 60_000, limit: 100 };

export const STRICT_THROTTLE = { default: { ttl: 60_000, limit: 5 } };
