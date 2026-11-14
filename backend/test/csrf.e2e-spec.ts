/**
 * BUG-01: chống CSRF qua cookie. Dựng app giống main.ts (NEST_APP_OPTIONS + initApp) với
 * controller admin giả và AuthController thật (AuthService mock), không cần database.
 */
import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { AuthController } from '../src/app/auth/auth.controller';
import { AuthService } from '../src/app/auth/auth.service';
import { CreateUserDto } from '../src/app/users/dto/create-user.dto';
import { initApp, NEST_APP_OPTIONS } from '../src/init';

const FE = 'http://localhost:3000';

@Controller('admin/users')
class FakeAdminUsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {
    return dto;
  }
}

describe('CSRF (e2e)', () => {
  let app: INestApplication;
  const env = { ...process.env };

  beforeAll(async () => {
    Object.assign(process.env, { FE_URL: FE, APP_PREFIX: '/api' });
    // Prisma Client tự nạp .env khi import: bỏ giá trị local để test đúng giá trị MẶC ĐỊNH
    delete process.env.COOKIE_SAME_SITE;
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true })],
      controllers: [FakeAdminUsersController, AuthController],
      providers: [
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        {
          provide: AuthService,
          useValue: { signIn: jest.fn().mockResolvedValue({ accessToken: 'a.jwt', refreshToken: 'r.jwt' }) },
        },
      ],
    }).compile();

    app = initApp(moduleRef.createNestApplication<NestExpressApplication>(NEST_APP_OPTIONS));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env = env;
  });

  const adminUser = 'email=hacker@evil.com&password=12345678&fullName=x&role=admin';

  it('POST /api/admin/users với body form-urlencoded → 415, không tạo được admin', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Cookie', 'accessToken=x')
      .set('Origin', FE)
      .type('form')
      .send(adminUser);
    expect(res.status).toBe(415);
  });

  it('form tự submit từ trang lạ (có cookie đăng nhập) → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Cookie', 'accessToken=x')
      .set('Origin', 'https://evil.example')
      .type('form')
      .send(adminUser);
    expect(res.status).toBe(403);
  });

  it('upload multipart từ trang lạ (có cookie đăng nhập) → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Cookie', 'accessToken=x')
      .set('Origin', 'https://evil.example')
      .attach('files', Buffer.from('x'), 'a.jpg');
    expect(res.status).toBe(403);
  });

  it('JSON từ frontend vẫn hoạt động bình thường', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Cookie', 'accessToken=x')
      .set('Origin', FE)
      .send({ email: 'a@b.com', password: '12345678', fullName: 'A' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'a@b.com', role: 'customer' });
  });

  it('logout từ frontend (POST không body, chỉ có cookie) vẫn hoạt động', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', 'accessToken=x; refreshToken=y')
      .set('Origin', FE)
      .set('Content-Length', '0');
    expect(res.status).toBe(200);
  });

  it('cookie đăng nhập không còn SameSite=None (mặc định Lax), vẫn HttpOnly + Secure', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .set('Origin', FE)
      .send({ email: 'a@b.com', password: '12345678' });

    expect(res.status).toBe(200);
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) {
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).not.toMatch(/SameSite=None/i);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Secure/i);
    }
  });
});
