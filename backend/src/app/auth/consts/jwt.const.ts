import type { UserInfo } from '../../../common/decorators/user.decorator';

export enum JWTEnvs {
  JWT_SECRET = 'JWT_SECRET',
  JWT_REFRESH_SECRET = 'JWT_REFRESH_SECRET',
}

export const ACCESS_TOKEN_TTL = 15 * 60;
export const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;
export const RESET_PASSWORD_TTL = 15 * 60;

export enum TokenKeys {
  ACCESS_TOKEN_KEY = 'accessToken',
  REFRESH_TOKEN_KEY = 'refreshToken',
}

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export interface JwtPayload extends UserInfo {
  type: TokenType;
  ver?: number;
}
