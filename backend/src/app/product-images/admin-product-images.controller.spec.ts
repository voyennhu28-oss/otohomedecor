import { BadRequestException, INestApplication } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { IS_ADMIN_ONLY } from '../../common/decorators/admin-only.decorator';
import { AdminProductImagesController } from './admin-product-images.controller';
import { MAX_IMAGES_PER_UPLOAD } from './product-images.const';
import { ProductImagesService } from './product-images.service';

const P = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const URL = `/admin/products/${P}/images`;
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

/**
 * Test qua HTTP để chạy thật ZodValidationPipe (param) và multer (FilesInterceptor + fileFilter).
 * Multer không có storage → giữ file trong bộ nhớ, service được mock.
 */
describe('AdminProductImagesController', () => {
  let app: INestApplication;
  const imagesService = { upload: jest.fn(), remove: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminProductImagesController],
      providers: [
        { provide: ProductImagesService, useValue: imagesService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    imagesService.upload.mockImplementation((_id, files: unknown[]) => Promise.resolve(files.map((_, i) => ({ sortOrder: i }))));
    imagesService.remove.mockResolvedValue([]);
  });

  it('chỉ admin (gắn @AdminOnly ở cấp class)', () => {
    expect(Reflect.getMetadata(IS_ADMIN_ONLY, AdminProductImagesController)).toBe(true);
  });

  describe('POST /admin/products/:productID/images', () => {
    it('ảnh jpg / png / webp hợp lệ → chuyển cho service', async () => {
      const res = await request(app.getHttpServer())
        .post(URL)
        .attach('files', JPG, { filename: 'a.jpg', contentType: 'image/jpeg' })
        .attach('files', JPG, { filename: 'b.png', contentType: 'image/png' })
        .attach('files', JPG, { filename: 'c.webp', contentType: 'image/webp' });

      expect(res.status).toBe(201);
      const [productID, files] = imagesService.upload.mock.calls[0];
      expect(productID).toBe(P);
      expect(files.map((f: { originalname: string }) => f.originalname)).toEqual(['a.jpg', 'b.png', 'c.webp']);
    });

    it('productID sai định dạng → 400, không gọi service', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/products/khong-phai-id/images')
        .attach('files', JPG, { filename: 'a.jpg', contentType: 'image/jpeg' });
      expect(res.status).toBe(400);
      expect(imagesService.upload).not.toHaveBeenCalled();
    });

    it('không chọn file → 400 (lỗi từ service)', async () => {
      imagesService.upload.mockRejectedValue(new BadRequestException('Chưa chọn ảnh nào'));
      const res = await request(app.getHttpServer()).post(URL).field('x', '1');
      expect(res.status).toBe(400);
      expect(imagesService.upload.mock.calls[0][1] ?? []).toEqual([]);
    });

    it.each([
      ['pdf', 'a.pdf', 'application/pdf'],
      ['svg (có thể chứa script)', 'a.svg', 'image/svg+xml'],
      ['gif', 'a.gif', 'image/gif'],
    ])('file %s → 400, không gọi service', async (_name, filename, contentType) => {
      const res = await request(app.getHttpServer()).post(URL).attach('files', JPG, { filename, contentType });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain(filename);
      expect(imagesService.upload).not.toHaveBeenCalled();
    });

    it(`quá ${MAX_IMAGES_PER_UPLOAD} ảnh một lần → 400`, async () => {
      let req = request(app.getHttpServer()).post(URL);
      for (let i = 0; i <= MAX_IMAGES_PER_UPLOAD; i++) {
        req = req.attach('files', JPG, { filename: `${i}.jpg`, contentType: 'image/jpeg' });
      }
      const res = await req;
      expect(res.status).toBe(400);
      expect(imagesService.upload).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /admin/products/:productID/images/:publicID', () => {
    it('chuyển productID + publicID cho service', async () => {
      const res = await request(app.getHttpServer()).delete(`${URL}/hd-product-x`);
      expect(res.status).toBe(200);
      expect(imagesService.remove).toHaveBeenCalledWith(P, 'hd-product-x');
    });

    it('productID sai định dạng → 400', async () => {
      const res = await request(app.getHttpServer()).delete('/admin/products/123/images/hd-product-x');
      expect(res.status).toBe(400);
      expect(imagesService.remove).not.toHaveBeenCalled();
    });
  });
});
