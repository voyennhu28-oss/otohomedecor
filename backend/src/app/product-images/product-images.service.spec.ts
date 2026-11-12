import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import { FileStrategy } from '../../common/utils/file-util/base/file.strategy';
import { ProductsService } from '../products/products.service';
import { ProductImagesService } from './product-images.service';

jest.mock('node:fs/promises', () => ({ unlink: jest.fn().mockResolvedValue(undefined) }));

const P = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const files = [
  { path: 'uploads/images/a.jpg', originalname: 'anh.jpg' },
  { path: 'uploads/images/b.jpg', originalname: 'anh.jpg' }, // cùng tên gốc
];

describe('ProductImagesService', () => {
  let service: ProductImagesService;
  let strategy: { upload: jest.Mock; remove: jest.Mock };
  let products: { findOneOrThrow: jest.Mock; appendImages: jest.Mock; removeImage: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = {
      upload: jest.fn((publicID: string) =>
        Promise.resolve({ public_id: publicID, secure_url: `https://cdn/${publicID}.jpg` }),
      ),
      remove: jest.fn().mockResolvedValue({ result: 'ok' }),
    };
    products = {
      findOneOrThrow: jest.fn().mockResolvedValue({ id: P }),
      appendImages: jest.fn((_id, images) => Promise.resolve(images)),
      removeImage: jest.fn().mockResolvedValue([]),
    };
    service = new ProductImagesService(
      products as unknown as ProductsService,
      strategy as unknown as FileStrategy,
    );
  });

  describe('upload', () => {
    it('mỗi ảnh có public_id riêng (không dùng tên file gốc), không chứa "/"', async () => {
      await service.upload(P, files);

      const publicIDs = strategy.upload.mock.calls.map(([publicID]) => publicID as string);
      expect(new Set(publicIDs).size).toBe(2);
      for (const id of publicIDs) {
        expect(id).toMatch(new RegExp(`^hd-product-${P}-[a-f0-9]{12}$`));
      }
    });

    it('lưu url + publicID trả về từ Cloudinary vào product', async () => {
      await service.upload(P, files);
      const [, images] = products.appendImages.mock.calls[0];
      expect(images).toHaveLength(2);
      expect(images[0]).toEqual({
        url: expect.stringMatching(/^https:\/\/cdn\//),
        publicID: expect.stringMatching(/^hd-product-/),
      });
    });

    it('luôn xóa file tạm, kể cả khi upload lỗi', async () => {
      strategy.upload.mockRejectedValueOnce(new Error('Cloudinary down'));
      await expect(service.upload(P, files)).rejects.toThrow('Cloudinary down');
      expect(fs.unlink).toHaveBeenCalledTimes(2);
    });

    it('product không tồn tại → 404, không upload, vẫn xóa file tạm', async () => {
      products.findOneOrThrow.mockRejectedValue(new NotFoundException());
      await expect(service.upload(P, files)).rejects.toBeInstanceOf(NotFoundException);
      expect(strategy.upload).not.toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalledTimes(2);
    });

    it('không có file → 400', async () => {
      await expect(service.upload(P, [])).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('bỏ khỏi product rồi xóa trên Cloudinary', async () => {
      await service.remove(P, 'hd-product-x');
      expect(products.removeImage).toHaveBeenCalledWith(P, 'hd-product-x');
      expect(strategy.remove).toHaveBeenCalledWith('hd-product-x');
    });

    it('Cloudinary lỗi: vẫn trả kết quả, chỉ ghi log', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      strategy.remove.mockRejectedValue(new Error('timeout'));

      await expect(service.remove(P, 'hd-product-x')).resolves.toEqual([]);
      await new Promise(process.nextTick);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
