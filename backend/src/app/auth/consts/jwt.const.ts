import type { UserInfo } from '../../../common/decorators/user.decorator';

export enum JWTEnvs {
  JWT_SECRET = 'JWT_SECRET',
  JWT_REFRESH_SECRET = 'JWT_REFRESH_SECRET',
}

// Đơn vị: giây. Access token ngắn vì không kiểm tra DB mỗi request;
// refresh token dài và mỗi lần refresh sẽ đọc lại role / status từ DB.
export const ACCESS_TOKEN_TTL = 15 * 60;
export const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;
export const RESET_PASSWORD_TTL = 15 * 60;

export enum TokenKeys {
  ACCESS_TOKEN_KEY = 'accessToken',
  REFRESH_TOKEN_KEY = 'refreshToken',
}

/** Claim `type` để access token không dùng thay refresh token được (và ngược lại). */
export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export interface JwtPayload extends UserInfo {
  type: TokenType;
}
