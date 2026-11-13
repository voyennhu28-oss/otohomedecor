import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { SepayWebhookDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';
import { SepayApiKeyGuard } from './sepay-api-key.guard';

/**
 * SePay gọi khi tài khoản nhận tiền có biến động. Không đăng nhập (xác thực bằng API key),
 * không giới hạn tần suất (SePay gửi lại tối đa 7 lần khi lỗi).
 */
@ApiTags('Payments')
@Public()
@SkipThrottle()
@Controller('payments/sepay')
export class SepayWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * SePay chỉ coi là thành công khi HTTP 200 + đúng body `{ "success": true }`.
   * Giao dịch bỏ qua / trùng vẫn trả thành công; lỗi hệ thống → 5xx để SePay gửi lại.
   */
  @Post('webhook')
  @HttpCode(200)
  @UseGuards(SepayApiKeyGuard)
  async webhook(@Body() payload: SepayWebhookDto) {
    await this.paymentsService.handleSepayWebhook(payload);
    return { success: true };
  }
}
