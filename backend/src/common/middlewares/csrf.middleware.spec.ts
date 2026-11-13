import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { parseOrigins, rejectNonJsonBody, verifyOrigin } from './csrf.middleware';

const FE = 'https://shop.example.com';

const createApp = () => {
  const app = express();
  app.use(cookieParser(), verifyOrigin([FE]), rejectNonJsonBody, express.json());
  app.all('/api/admin/users', (req, res) => {
    res.status(201).json({ body: req.body ?? null });
  });
  return app;
};

describe('csrf.middleware', () => {
  const app = createApp();

  describe('parseOrigins', () => {
    it('tách theo dấu phẩy, chuẩn hóa về origin, bỏ giá trị sai', () => {
      expect(parseOrigins('https://a.com/, http://localhost:3000/path ,abc')).toEqual([
        'https://a.com',
        'http://localhost:3000',
      ]);
      expect(parseOrigins(undefined)).toEqual([]);
    });
  });

  describe('verifyOrigin', () => {
    const post = () => request(app).post('/api/admin/users').send({ a: 1 });

    it('có cookie đăng nhập + Origin trang lạ → 403', async () => {
      const res = await post().set('Cookie', 'accessToken=x').set('Origin', 'https://evil.example');
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ errors: [{ message: expect.any(String) }], data: null, message: 'ERROR' });
    });

    it('cookie refreshToken cũng được bảo vệ', async () => {
      const res = await post().set('Cookie', 'refreshToken=x').set('Origin', 'https://evil.example');
      expect(res.status).toBe(403);
    });

    it('Origin "null" (iframe sandbox, file://) → 403', async () => {
      const res = await post().set('Cookie', 'accessToken=x').set('Origin', 'null');
      expect(res.status).toBe(403);
    });

    it('Origin là frontend (FE_URL) → cho qua', async () => {
      const res = await post().set('Cookie', 'accessToken=x').set('Origin', FE);
      expect(res.status).toBe(201);
    });

    it('Origin là chính API (Swagger cùng host) → cho qua', async () => {
      const res = await post()
        .set('Cookie', 'accessToken=x')
        .set('Host', 'api.shop.example.com')
        .set('Origin', 'https://api.shop.example.com');
      expect(res.status).toBe(201);
    });

    it('không có Origin: Sec-Fetch-Site cross-site → 403, same-origin → cho qua', async () => {
      const cross = await post().set('Cookie', 'accessToken=x').set('Sec-Fetch-Site', 'cross-site');
      expect(cross.status).toBe(403);
      const same = await post().set('Cookie', 'accessToken=x').set('Sec-Fetch-Site', 'same-origin');
      expect(same.status).toBe(201);
    });

    it('không có cookie đăng nhập (Bearer token, webhook) → không kiểm tra Origin', async () => {
      const res = await post().set('Authorization', 'Bearer x').set('Origin', 'https://evil.example');
      expect(res.status).toBe(201);
    });

    it('GET không bị kiểm tra', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', 'accessToken=x')
        .set('Origin', 'https://evil.example');
      expect(res.status).toBe(201);
    });
  });

  describe('rejectNonJsonBody', () => {
    it.each([
      ['form-urlencoded', 'application/x-www-form-urlencoded', 'email=a@b.com&role=admin'],
      ['text/plain', 'text/plain', '{"role":"admin"}'],
    ])('body %s → 415', async (_name, type, body) => {
      const res = await request(app).post('/api/admin/users').set('Content-Type', type).send(body);
      expect(res.status).toBe(415);
    });

    it('JSON → cho qua', async () => {
      const res = await request(app).post('/api/admin/users').send({ role: 'admin' });
      expect(res.status).toBe(201);
      expect(res.body.body).toEqual({ role: 'admin' });
    });

    it('multipart (upload ảnh) → cho qua', async () => {
      const res = await request(app).post('/api/admin/users').attach('files', Buffer.from('x'), 'a.jpg');
      expect(res.status).toBe(201);
    });

    it('không có body (logout / refresh-token chỉ gửi cookie, Content-Length: 0) → cho qua', async () => {
      const res = await request(app).post('/api/admin/users').set('Content-Length', '0');
      expect(res.status).toBe(201);
    });

    it('body không có Content-Type → 415', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Content-Length', '2')
        .send(Buffer.from('{}'))
        .unset('Content-Type');
      expect(res.status).toBe(415);
    });
  });
});
