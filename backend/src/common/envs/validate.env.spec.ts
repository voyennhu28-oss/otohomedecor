import { Logger } from '@nestjs/common';
import { validate } from './validate.env';

const SECRET_A = 'a'.repeat(64);
const SECRET_B = 'b'.repeat(64);

const baseEnv = (overrides: Record<string, unknown> = {}) => ({
  DATABASE_URL: 'mongodb+srv://u:p@cluster.mongodb.net/home_decor?retryWrites=true',
  JWT_SECRET: SECRET_A,
  JWT_REFRESH_SECRET: SECRET_B,
  ...overrides,
});

describe('validate (env)', () => {
  beforeAll(() => jest.spyOn(Logger, 'warn').mockImplementation());
  afterAll(() => jest.restoreAllMocks());

  it('env tối thiểu hợp lệ: điền mặc định, ép kiểu số, giữ biến lạ', () => {
    const env = validate(baseEnv({ MAIL_PORT: '', THROTTLE_LIMIT: '50', SEPAY_BANK: 'X' }));
    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 5000,
      MAIL_PORT: 587, // để trống → mặc định
      THROTTLE_LIMIT: 50,
      COOKIE_SAME_SITE: 'lax',
      FE_URL: 'http://localhost:3000',
      SEPAY_BANK: 'X',
    });
  });

  const prod = {
    NODE_ENV: 'production',
    CLOUDINARY_NAME: 'n', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's',
    SEPAY_WEBHOOK_API_KEY: 'sepay-key', SEPAY_BANK: 'VCB', SEPAY_ACCOUNT_NUMBER: '0123456789',
  };

  it('production đủ biến → hợp lệ; thiếu SEPAY_* → báo rõ tên biến', () => {
    expect(() => validate(baseEnv(prod))).not.toThrow();
    for (const key of ['SEPAY_BANK', 'SEPAY_ACCOUNT_NUMBER']) {
      expect(() => validate(baseEnv({ ...prod, [key]: '' }))).toThrow(key);
    }
  });

  it('production: xác thực webhook SePay bằng HMAC (SECRET) hoặc API key, phải có ít nhất 1', () => {
    const { SEPAY_WEBHOOK_API_KEY: _apiKey, ...noAuth } = prod;
    expect(() => validate(baseEnv({ ...noAuth, SEPAY_WEBHOOK_SECRET: 'hmac-secret' }))).not.toThrow();
    expect(() => validate(baseEnv(noAuth))).toThrow('SEPAY_WEBHOOK_SECRET');
    expect(() => validate(baseEnv({ ...noAuth, NODE_ENV: 'development' }))).not.toThrow(); // dev chỉ cảnh báo
  });

  it('SEPAY_ACCOUNT_NUMBER chỉ gồm chữ và số', () => {
    expect(() => validate(baseEnv({ SEPAY_ACCOUNT_NUMBER: '0123-456' }))).toThrow('SEPAY_ACCOUNT_NUMBER');
  });

  it('Brevo: có MAIL_HOST mà thiếu MAIL_FROM → production lỗi, dev chỉ cảnh báo', () => {
    const mail = { MAIL_HOST: 'smtp-relay.brevo.com', MAIL_USER: 'abc@smtp-brevo.com', MAIL_PASS: 'key' };
    expect(() => validate(baseEnv(mail))).not.toThrow();
    expect(() => validate(baseEnv({ ...mail, ...prod }))).toThrow('MAIL_FROM');
    expect(() => validate(baseEnv({ ...mail, ...prod, MAIL_FROM: 'Shop <no-reply@shop.vn>' }))).not.toThrow();
  });

  it.each(['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'])('thiếu %s → báo rõ tên biến', (key) => {
    expect(() => validate(baseEnv({ [key]: undefined }))).toThrow(key);
    expect(() => validate(baseEnv({ [key]: '' }))).toThrow(key);
  });

  it('DATABASE_URL không có tên database → lỗi', () => {
    expect(() =>
      validate(baseEnv({ DATABASE_URL: 'mongodb+srv://u:p@cluster.mongodb.net/?retryWrites=true' })),
    ).toThrow('DATABASE_URL');
  });

  it('2 secret JWT trùng nhau → lỗi', () => {
    expect(() => validate(baseEnv({ JWT_REFRESH_SECRET: SECRET_A }))).toThrow('JWT_REFRESH_SECRET');
  });

  it('secret ngắn: dev chỉ cảnh báo, production thì lỗi', () => {
    const short = { JWT_SECRET: 'short-1', JWT_REFRESH_SECRET: 'short-2' };
    expect(() => validate(baseEnv(short))).not.toThrow();
    expect(() =>
      validate(baseEnv({ ...short, NODE_ENV: 'production', CLOUDINARY_NAME: 'n', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's' })),
    ).toThrow('JWT_SECRET');
  });

  it('production thiếu CLOUDINARY_* → lỗi; dev thì không', () => {
    expect(() => validate(baseEnv())).not.toThrow();
    expect(() => validate(baseEnv({ NODE_ENV: 'production' }))).toThrow('CLOUDINARY_NAME');
  });

  it('COOKIE_SAME_SITE / FE_URL sai giá trị → lỗi', () => {
    expect(() => validate(baseEnv({ COOKIE_SAME_SITE: 'abc' }))).toThrow('COOKIE_SAME_SITE');
    expect(() => validate(baseEnv({ FE_URL: 'not-a-url' }))).toThrow('FE_URL');
  });
});
