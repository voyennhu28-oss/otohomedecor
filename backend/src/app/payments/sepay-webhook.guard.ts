import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { safeEqual, verifySepaySignature } from './sepay.util';

/**
 * Xác thực webhook SePay (developer.sepay.vn/vi/sepay-webhooks/xac-thuc), chọn theo env:
 *  - SEPAY_WEBHOOK_SECRET  → HMAC-SHA256 (SePay khuyến nghị): header X-SePay-Signature + X-SePay-Timestamp
 *  - SEPAY_WEBHOOK_API_KEY → API Key: header `Authorization: Apikey <key>`
 * Đặt cả hai thì dùng HMAC. Guard chạy trước validate body: request không hợp lệ bị chặn sớm.
 * HMAC cần body gốc: app phải tạo với `rawBody: true` (NEST_APP_OPTIONS).
 */
@Injectable()
export class SepayWebhookGuard implements CanActivate {
  private readonly secret?: string;
  private readonly apiKey?: string;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('SEPAY_WEBHOOK_SECRET') || undefined;
    this.apiKey = config.get<string>('SEPAY_WEBHOOK_API_KEY') || undefined;
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    if (this.secret) return this.checkSignature(req, this.secret);
    if (this.apiKey) return this.checkApiKey(req, this.apiKey);
    // Chưa cấu hình: 503 để SePay gửi lại sau khi cấu hình xong, không âm thầm nhận mọi request
    throw new ServiceUnavailableException('Chưa cấu hình SEPAY_WEBHOOK_SECRET hoặc SEPAY_WEBHOOK_API_KEY');
  }

  private checkSignature(req: Request & { rawBody?: Buffer }, secret: string) {
    const result = verifySepaySignature({
      rawBody: req.rawBody,
      timestamp: req.header('x-sepay-timestamp'),
      signature: req.header('x-sepay-signature'),
      secret,
    });
    if (result === 'expired') throw new UnauthorizedException('Webhook đã hết hạn (timestamp lệch quá 5 phút)');
    if (result !== 'ok') throw new UnauthorizedException('Chữ ký webhook không hợp lệ');
    return true;
  }

  private checkApiKey(req: Request, apiKey: string) {
    const [scheme, key] = (req.headers.authorization ?? '').trim().split(/\s+/, 2);
    if (scheme?.toLowerCase() !== 'apikey' || !key || !safeEqual(key, apiKey)) {
      throw new UnauthorizedException('API key không hợp lệ');
    }
    return true;
  }
}
