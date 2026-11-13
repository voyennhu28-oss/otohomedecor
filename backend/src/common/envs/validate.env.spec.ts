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
    const env = validate(baseEnv({ MAIL_PORT: '', THROTTLE_LIMIT: '50', VNPAY_TMN_CODE: 'X' }));
    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 5000,
      MAIL_PORT: 587, // để trống → mặc định
      THROTTLE_LIMIT: 50,
      COOKIE_SAME_SITE: 'lax',
      FE_URL: 'http://localhost:3000',
      VNPAY_TMN_CODE: 'X',
    });
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
