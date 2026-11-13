/**
 * Webhook SePay qua HTTP thật: guard API key chạy TRƯỚC validate body, response đúng
 * `{"success":true}` (SePay coi body khác là thất bại), lỗi hệ thống → 5xx để SePay gửi lại.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { IS_PUBLIC } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { SepayApiKeyGuard } from './sepay-api-key.guard';
import { SepayWebhookController } from './sepay-webhook.controller';

const API_KEY = 'sepay-test-key-0123456789';
const body = {
  id: 1,
  gateway: 'Vietcombank',
  accountNumber: '0123',
  code: 'HD2611137K3M9Q',
  content: 'HD2611137K3M9Q',
  transferType: 'in',
  transferAmount: 100_000,
  newFieldFromSepay: 'x', // field mới SePay thêm sau này không làm webhook lỗi
};

describe('SepayWebhookController', () => {
  let app: INestApplication;
  const payments = { handleSepayWebhook: jest.fn() };

  const createApp = async (apiKey?: string) => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SepayWebhookController],
      providers: [
        { provide: PaymentsService, useValue: payments },
        { provide: ConfigService, useValue: { get: () => apiKey } },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        SepayApiKeyGuard,
      ],
    }).compile();
    const nestApp = moduleRef.createNestApplication();
    await nestApp.init();
    return nestApp;
  };

  beforeAll(async () => {
    app = await createApp(API_KEY);
  });
  afterAll(() => app.close());
  beforeEach(() => {
    payments.handleSepayWebhook.mockReset();
    payments.handleSepayWebhook.mockResolvedValue({ outcome: 'paid' });
  });

  const post = () => request(app.getHttpServer()).post('/payments/sepay/webhook');

  it('là @Public (xác thực bằng API key, không cần đăng nhập)', () => {
    expect(Reflect.getMetadata(IS_PUBLIC, SepayWebhookController)).toBe(true);
  });

  it('đúng API key → 200 và ĐÚNG body {"success":true}', async () => {
    const res = await post().set('Authorization', `Apikey ${API_KEY}`).send(body);
    expect(res.status).toBe(200);
    expect(res.text).toBe('{"success":true}');
    expect(payments.handleSepayWebhook).toHaveBeenCalledWith(expect.objectContaining({ id: 1, transferAmount: 100_000 }));
  });

  it('chữ "Apikey" không phân biệt hoa thường', async () => {
    const res = await post().set('Authorization', `APIKEY ${API_KEY}`).send(body);
    expect(res.status).toBe(200);
  });

  it.each([
    ['không có header', undefined],
    ['sai key', 'Apikey wrong-key'],
    ['sai scheme', `Bearer ${API_KEY}`],
    ['thiếu key', 'Apikey'],
  ])('%s → 401, không xử lý', async (_name, header) => {
    const req = post();
    if (header) req.set('Authorization', header);
    const res = await req.send(body);
    expect(res.status).toBe(401);
    expect(payments.handleSepayWebhook).not.toHaveBeenCalled();
  });

  it('chưa có key mà body sai → vẫn 401 (guard chạy trước validate, không lộ schema)', async () => {
    const res = await post().send({ foo: 'bar' });
    expect(res.status).toBe(401);
  });

  it('đúng key, body sai → 400', async () => {
    const res = await post().set('Authorization', `Apikey ${API_KEY}`).send({ id: 'abc' });
    expect(res.status).toBe(400);
  });

  it('giao dịch bị bỏ qua / trùng vẫn trả {"success":true} (SePay không gửi lại)', async () => {
    payments.handleSepayWebhook.mockResolvedValue({ outcome: 'duplicate' });
    const res = await post().set('Authorization', `Apikey ${API_KEY}`).send(body);
    expect(res.text).toBe('{"success":true}');
  });

  it('lỗi hệ thống → 5xx để SePay gửi lại', async () => {
    payments.handleSepayWebhook.mockRejectedValue(new Error('db down'));
    const res = await post().set('Authorization', `Apikey ${API_KEY}`).send(body);
    expect(res.status).toBeGreaterThanOrEqual(500);
  });

  it('server chưa cấu hình SEPAY_WEBHOOK_API_KEY → 503 (SePay gửi lại sau), không nhận bừa', async () => {
    const unconfigured = await createApp(undefined);
    const res = await request(unconfigured.getHttpServer())
      .post('/payments/sepay/webhook')
      .set('Authorization', 'Apikey anything')
      .send(body);
    expect(res.status).toBe(503);
    expect(payments.handleSepayWebhook).not.toHaveBeenCalled();
    await unconfigured.close();
  });
});
