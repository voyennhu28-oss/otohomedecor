import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'node:fs/promises';
import { createPrismaModelMock, PrismaModelMock } from '../../../test/mocks/prisma.mock';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FileStrategy } from '../../common/utils/file-util/base/file.strategy';
import { ImageUploadService } from '../../common/utils/file-util/image-upload.service';
import { MAX_IMAGES_PER_REVIEW, ReviewImagesService } from './review-images.service';

jest.mock('node:fs/promises', () => ({ unlink: jest.fn().mockResolvedValue(undefined) }));

const R = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const files = (n: number) => Array.from({ length: n }, (_, i) => ({ path: `uploads/images/${i}.jpg`, originalname: `${i}.jpg` }));
const image = (publicID: string, sortOrder = 0) => ({ url: `https://cdn/${publicID}.jpg`, publicID, alt: null, sortOrder });

describe('ReviewImagesService', () => {
  let service: ReviewImagesService;
  let review: PrismaModelMock;
  let transaction: jest.Mock;
  let strategy: { upload: jest.Mock; remove: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    review = createPrismaModelMock();
    review.findFirst.mockResolvedValue({ images: [image('old', 0)] });
    review.update.mockResolvedValue({});
    const prisma = { review } as unknown as PrismaService;
    transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(prisma));
    Object.assign(prisma, { $transaction: transaction });
    strategy = {
      upload: jest.fn((publicID: string) => Promise.resolve({ public_id: publicID, secure_url: `https://cdn/${publicID}.jpg` })),
      remove: jest.fn().mockResolvedValue({ result: 'ok' }),
    };
    service = new ReviewImagesService(prisma, new ImageUploadService(strategy as unknown as FileStrategy));
  });

  describe('upload', () => {
    it('chủ review: upload rồi thêm vào cuối, sortOrder nối tiếp; public_id riêng cho review', async () => {
      const images = await service.upload('u1', R, files(2));

      expect(review.findFirst).toHaveBeenCalledWith({ where: { id: R, userID: 'u1' }, select: { images: true } });
      expect(images).toHaveLength(3);
      expect(images[1]).toEqual({
        url: expect.stringMatching(/^https:\/\/cdn\//),
        publicID: expect.stringMatching(new RegExp(`^hd-review-${R}-[a-f0-9]{12}$`)),
        alt: null,
        sortOrder: 1,
      });
      expect(review.update).toHaveBeenCalledWith({ where: { id: R }, data: { images: { set: images } } });
      expect(fs.unlink).toHaveBeenCalledTimes(2); // luôn xóa file tạm
    });

    it(`vượt ${MAX_IMAGES_PER_REVIEW} ảnh / review → 400 TRƯỚC khi upload (không tốn Cloudinary)`, async () => {
      review.findFirst.mockResolvedValue({ images: [image('a'), image('b'), image('c'), image('d')] });
      await expect(service.upload('u1', R, files(2))).rejects.toThrow('tối đa 5 ảnh (đang có 4, thêm 2)');
      expect(strategy.upload).not.toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalledTimes(2);
    });

    it('review của người khác / không tồn tại → 404, không upload', async () => {
      review.findFirst.mockResolvedValue(null);
      await expect(service.upload('u1', R, files(1))).rejects.toBeInstanceOf(NotFoundException);
      expect(strategy.upload).not.toHaveBeenCalled();
    });

    it('không chọn ảnh → 400', async () => {
      await expect(service.upload('u1', R, [])).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.upload('u1', R, undefined)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('2 lần upload song song: lúc lưu (trong transaction) đã đủ ảnh → 400 và xóa ảnh vừa upload', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      review.findFirst
        .mockResolvedValueOnce({ images: [image('a')] }) // kiểm tra trước: còn chỗ
        .mockResolvedValueOnce({ images: [image('a'), image('b'), image('c'), image('d')] }); // lúc lưu: request kia đã thêm

      await expect(service.upload('u1', R, files(2))).rejects.toBeInstanceOf(BadRequestException);

      const uploadedIDs = strategy.upload.mock.calls.map(([id]) => id);
      expect(strategy.remove.mock.calls.map(([id]) => id)).toEqual(uploadedIDs);
      expect(review.update).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('1 ảnh upload lỗi → không lưu gì, xóa các ảnh đã lên Cloudinary', async () => {
      strategy.upload.mockRejectedValueOnce(new Error('Cloudinary down'));
      await expect(service.upload('u1', R, files(2))).rejects.toThrow('Cloudinary down');
      expect(review.update).not.toHaveBeenCalled();
      expect(strategy.remove).toHaveBeenCalledTimes(1);
    });

    it('xung đột transaction (P2034) → đọc lại và lưu', async () => {
      review.update
        .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 't' }))
        .mockResolvedValue({});
      await expect(service.upload('u1', R, files(1))).resolves.toHaveLength(2);
      expect(transaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('remove', () => {
    beforeEach(() => review.findFirst.mockResolvedValue({ images: [image('a', 0), image('b', 1)] }));

    it('chủ review gỡ ảnh: bỏ khỏi review rồi xóa trên Cloudinary', async () => {
      await expect(service.removeMine('u1', R, 'a')).resolves.toEqual([image('b', 1)]);
      expect(review.findFirst.mock.calls[0][0].where).toEqual({ id: R, userID: 'u1' });
      expect(strategy.remove).toHaveBeenCalledWith('a');
    });

    it('admin gỡ ảnh: không cần là chủ review', async () => {
      await service.removeAsAdmin(R, 'b');
      expect(review.findFirst.mock.calls[0][0].where).toEqual({ id: R });
      expect(strategy.remove).toHaveBeenCalledWith('b');
    });

    it('ảnh không có trong review → 404, không xóa gì', async () => {
      await expect(service.removeMine('u1', R, 'khong-co')).rejects.toBeInstanceOf(NotFoundException);
      expect(review.update).not.toHaveBeenCalled();
      expect(strategy.remove).not.toHaveBeenCalled();
    });

    it('review của người khác → 404', async () => {
      review.findFirst.mockResolvedValue(null);
      await expect(service.removeMine('u2', R, 'a')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
