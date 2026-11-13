/** Qua HTTP để chạy thật ZodValidationPipe (param) và multer (giới hạn số ảnh, loại file). */
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { IS_PUBLIC } from '../../common/decorators/public.decorator';
import { ReviewImagesController } from './review-images.controller';
import { MAX_IMAGES_PER_REVIEW, ReviewImagesService } from './review-images.service';

const R = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const URL = `/reviews/${R}/images`;
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

describe('ReviewImagesController', () => {
  let app: INestApplication;
  const service = { upload: jest.fn(), removeMine: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReviewImagesController],
      providers: [
        { provide: ReviewImagesService, useValue: service },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        // giả lập AuthGuard: gắn user đang đăng nhập
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (ctx: ExecutionContext) => {
              ctx.switchToHttp().getRequest().user = { userID: 'u1', userEmail: 'a@b.c', role: 'customer' };
              return true;
            },
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    service.upload.mockResolvedValue([]);
    service.removeMine.mockResolvedValue([]);
  });

  it('cần đăng nhập (không @Public)', () => {
    expect(Reflect.getMetadata(IS_PUBLIC, ReviewImagesController)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC, ReviewImagesController.prototype.upload)).toBeUndefined();
  });

  it('upload: userID lấy từ token, chuyển file cho service', async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .attach('files', JPG, { filename: 'a.jpg', contentType: 'image/jpeg' })
      .attach('files', JPG, { filename: 'b.webp', contentType: 'image/webp' });
    expect(res.status).toBe(201);
    const [userID, reviewID, files] = service.upload.mock.calls[0];
    expect([userID, reviewID]).toEqual(['u1', R]);
    expect(files.map((f: { originalname: string }) => f.originalname)).toEqual(['a.jpg', 'b.webp']);
  });

  it(`quá ${MAX_IMAGES_PER_REVIEW} ảnh một lần → 400`, async () => {
    let req = request(app.getHttpServer()).post(URL);
    for (let i = 0; i <= MAX_IMAGES_PER_REVIEW; i++) {
      req = req.attach('files', JPG, { filename: `${i}.jpg`, contentType: 'image/jpeg' });
    }
    expect((await req).status).toBe(400);
    expect(service.upload).not.toHaveBeenCalled();
  });

  it.each([
    ['svg (có thể chứa script)', 'a.svg', 'image/svg+xml'],
    ['gif', 'a.gif', 'image/gif'],
    ['pdf', 'a.pdf', 'application/pdf'],
  ])('file %s → 400', async (_name, filename, contentType) => {
    const res = await request(app.getHttpServer()).post(URL).attach('files', JPG, { filename, contentType });
    expect(res.status).toBe(400);
    expect(service.upload).not.toHaveBeenCalled();
  });

  it('id review sai định dạng → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/reviews/abc/images')
      .attach('files', JPG, { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });

  it('DELETE: chuyển userID + id + publicID', async () => {
    const res = await request(app.getHttpServer()).delete(`${URL}/hd-review-x`);
    expect(res.status).toBe(200);
    expect(service.removeMine).toHaveBeenCalledWith('u1', R, 'hd-review-x');
  });
});
