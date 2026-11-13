import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { safeEqual } from './sepay.util';

/**
 * Webhook SePay chứng thực bằng API Key: header `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>`
 * (developer.sepay.vn/vi/sepay-webhooks/xac-thuc). Guard chạy trước validate body,
 * nên request không có key bị chặn trước khi chạm tới dữ liệu.
 */
@Injectable()
export class SepayApiKeyGuard implements CanActivate {
  private readonly apiKey?: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('SEPAY_WEBHOOK_API_KEY') || undefined;
  }

  canActivate(context: ExecutionContext): boolean {
    // Chưa cấu hình: 503 để SePay gửi lại sau khi cấu hình xong, không âm thầm nhận mọi request
    if (!this.apiKey) throw new ServiceUnavailableException('Chưa cấu hình SEPAY_WEBHOOK_API_KEY');

    const header = context.switchToHttp().getRequest<Request>().headers.authorization ?? '';
    const [scheme, key] = header.trim().split(/\s+/, 2);
    if (scheme?.toLowerCase() !== 'apikey' || !key || !safeEqual(key, this.apiKey)) {
      throw new UnauthorizedException('API key không hợp lệ');
    }
    return true;
  }
}
