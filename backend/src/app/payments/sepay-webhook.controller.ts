import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { SkipFormatResponse } from '../../common/decorators/skip-format-response.decorator';
import { SepayWebhookDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';
import { SepayWebhookGuard } from './sepay-webhook.guard';

@ApiTags('Payments')
@Public()
@SkipThrottle()
@Controller('payments/sepay')
export class SepayWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @HttpCode(200)
  @SkipFormatResponse()
  @UseGuards(SepayWebhookGuard)
  async webhook(@Body() payload: SepayWebhookDto) {
    await this.paymentsService.handleSepayWebhook(payload);
    return { success: true };
  }
}
