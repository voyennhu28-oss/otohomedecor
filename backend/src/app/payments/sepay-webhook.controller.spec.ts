/**
 * Webhook SePay qua HTTP thật: guard xác thực (HMAC-SHA256 hoặc API key) chạy TRƯỚC validate body,
 * response đúng `{"success":true}` (SePay coi body khác là thất bại), lỗi hệ thống → 5xx để SePay gửi lại.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { IS_PUBLIC } from '../../common/decorators/public.decorator';
import { NEST_APP_OPTIONS } from '../../init';
import { PaymentsService } from './payments.service';
import { SepayWebhookController } from './sepay-webhook.controller';
import { SepayWebhookGuard } from './sepay-webhook.guard';

const API_KEY = 'sepay-test-key-0123456789';
const SECRET = 'sepay-hmac-secret-0123456789';
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
// Body gốc có dấu tiếng Việt + khoảng trắng "lạ": parse rồi stringify lại sẽ ra chuỗi khác → chữ ký sai
const RAW_BODY =
  '{"id": 2,  "content":"Thanh toán đơn HD2611137K3M9Q", "transferType":"in", "transferAmount":100000}';

const sign = (raw: string, timestamp: number, secret = SECRET) =>
  `sha256=${createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex')}`;
const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('SepayWebhookController', () => {
  const payments = { handleSepayWebhook: jest.fn() };

  const createApp = async (env: Record<string, string | undefined>) => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SepayWebhookController],
      providers: [
        { provide: PaymentsService, useValue: payments },
        { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        SepayWebhookGuard,
      ],
    }).compile();
    // rawBody giống main.ts (NEST_APP_OPTIONS), parser JSON mặc định cũng giữ body gốc
    const app = moduleRef.createNestApplication({ rawBody: NEST_APP_OPTIONS.rawBody });
    await app.init();
    return app;
  };

  beforeEach(() => {
    payments.handleSepayWebhook.mockReset();
    payments.handleSepayWebhook.mockResolvedValue({ outcome: 'paid' });
  });

  it('là @Public (xác thực bằng chữ ký / API key, không cần đăng nhập)', () => {
    expect(Reflect.getMetadata(IS_PUBLIC, SepayWebhookController)).toBe(true);
  });

  describe('HMAC-SHA256 (SEPAY_WEBHOOK_SECRET)', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await createApp({ SEPAY_WEBHOOK_SECRET: SECRET });
    });
    afterAll(() => app.close());

    const post = (raw: string, headers: Record<string, string>) =>
      request(app.getHttpServer())
        .post('/payments/sepay/webhook')
        .set('Content-Type', 'application/json')
        .set(headers)
        .send(raw);

    it('chữ ký đúng trên BODY GỐC → 200 và ĐÚNG body {"success":true}', async () => {
      const ts = nowSeconds();
      const res = await post(RAW_BODY, { 'X-SePay-Timestamp': String(ts), 'X-SePay-Signature': sign(RAW_BODY, ts) });
      expect(res.status).toBe(200);
      expect(res.text).toBe('{"success":true}');
      expect(payments.handleSepayWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2, content: 'Thanh toán đơn HD2611137K3M9Q' }),
      );
    });

    it('ký trên JSON đã chuẩn hóa lại (không phải body gốc) → 401', async () => {
      const ts = nowSeconds();
      const reserialized = JSON.stringify(JSON.parse(RAW_BODY));
      const res = await post(RAW_BODY, { 'X-SePay-Timestamp': String(ts), 'X-SePay-Signature': sign(reserialized, ts) });
      expect(res.status).toBe(401);
    });

    it.each([
      ['sai secret', (ts: number) => ({ 'X-SePay-Timestamp': String(ts), 'X-SePay-Signature': sign(RAW_BODY, ts, 'wrong') })],
      ['thiếu chữ ký', (ts: number) => ({ 'X-SePay-Timestamp': String(ts) })],
      ['thiếu timestamp', (ts: number) => ({ 'X-SePay-Signature': sign(RAW_BODY, ts) })],
      ['timestamp khác lúc ký', (ts: number) => ({ 'X-SePay-Timestamp': String(ts + 1), 'X-SePay-Signature': sign(RAW_BODY, ts) })],
      ['dùng API key thay chữ ký', () => ({ Authorization: `Apikey ${API_KEY}` })],
    ])('%s → 401, không xử lý', async (_name, headers) => {
      const res = await post(RAW_BODY, headers(nowSeconds()));
      expect(res.status).toBe(401);
      expect(payments.handleSepayWebhook).not.toHaveBeenCalled();
    });

    it('timestamp cũ hơn 5 phút (request bị phát lại) → 401 "hết hạn"', async () => {
      const ts = nowSeconds() - 301;
      const res = await post(RAW_BODY, { 'X-SePay-Timestamp': String(ts), 'X-SePay-Signature': sign(RAW_BODY, ts) });
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/hết hạn/); // app test không có CatchEverythingFilter → format mặc định
    });

    it('chữ ký đúng nhưng body sai schema → 400', async () => {
      const ts = nowSeconds();
      const raw = '{"id":"abc"}';
      const res = await post(raw, { 'X-SePay-Timestamp': String(ts), 'X-SePay-Signature': sign(raw, ts) });
      expect(res.status).toBe(400);
    });
  });

  describe('API key (SEPAY_WEBHOOK_API_KEY)', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await createApp({ SEPAY_WEBHOOK_API_KEY: API_KEY });
    });
    afterAll(() => app.close());

    const post = () => request(app.getHttpServer()).post('/payments/sepay/webhook');

    it('đúng API key → 200 và ĐÚNG body {"success":true}', async () => {
      const res = await post().set('Authorization', `Apikey ${API_KEY}`).send(body);
      expect(res.status).toBe(200);
      expect(res.text).toBe('{"success":true}');
      expect(payments.handleSepayWebhook).toHaveBeenCalledWith(expect.objectContaining({ id: 1, transferAmount: 100_000 }));
    });

    it('chữ "Apikey" không phân biệt hoa thường', async () => {
      expect((await post().set('Authorization', `APIKEY ${API_KEY}`).send(body)).status).toBe(200);
    });

    it.each([
      ['không có header', undefined],
      ['sai key', 'Apikey wrong-key'],
      ['sai scheme', `Bearer ${API_KEY}`],
      ['thiếu key', 'Apikey'],
    ])('%s → 401, không xử lý', async (_name, header) => {
      const req = post();
      if (header) req.set('Authorization', header);
      expect((await req.send(body)).status).toBe(401);
      expect(payments.handleSepayWebhook).not.toHaveBeenCalled();
    });

    it('không có key mà body sai → vẫn 401 (guard chạy trước validate, không lộ schema)', async () => {
      expect((await post().send({ foo: 'bar' })).status).toBe(401);
    });

    it('giao dịch bỏ qua / trùng vẫn trả {"success":true} (SePay không gửi lại)', async () => {
      payments.handleSepayWebhook.mockResolvedValue({ outcome: 'duplicate' });
      const res = await post().set('Authorization', `Apikey ${API_KEY}`).send(body);
      expect(res.text).toBe('{"success":true}');
    });

    it('lỗi hệ thống → 5xx để SePay gửi lại', async () => {
      payments.handleSepayWebhook.mockRejectedValue(new Error('db down'));
      const res = await post().set('Authorization', `Apikey ${API_KEY}`).send(body);
      expect(res.status).toBeGreaterThanOrEqual(500);
    });
  });

  it('đặt cả 2 → dùng HMAC (API key không còn đủ)', async () => {
    const app = await createApp({ SEPAY_WEBHOOK_SECRET: SECRET, SEPAY_WEBHOOK_API_KEY: API_KEY });
    const res = await request(app.getHttpServer())
      .post('/payments/sepay/webhook')
      .set('Authorization', `Apikey ${API_KEY}`)
      .send(body);
    expect(res.status).toBe(401);
    await app.close();
  });

  it('chưa cấu hình cách xác thực nào → 503 (SePay gửi lại sau), không nhận bừa', async () => {
    const app = await createApp({});
    const res = await request(app.getHttpServer())
      .post('/payments/sepay/webhook')
      .set('Authorization', 'Apikey anything')
      .send(body);
    expect(res.status).toBe(503);
    expect(payments.handleSepayWebhook).not.toHaveBeenCalled();
    await app.close();
  });
});
