import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../app/app.controller';
import { AppService } from '../app/app.service';
import { IS_PUBLIC } from '../common/decorators/public.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const prisma = { $runCommandRaw: jest.fn() };

  beforeEach(async () => {
    prisma.$runCommandRaw.mockReset();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('public (nền tảng deploy gọi không có token)', () => {
      expect(Reflect.getMetadata(IS_PUBLIC, AppController.prototype.health)).toBe(true);
    });

    it('ping được MongoDB → ok', async () => {
      prisma.$runCommandRaw.mockResolvedValue({ ok: 1 });
      await expect(appController.health()).resolves.toMatchObject({ status: 'ok', database: 'up' });
      expect(prisma.$runCommandRaw).toHaveBeenCalledWith({ ping: 1 });
    });

    it('MongoDB lỗi → 503 (nền tảng biết để restart / không chuyển traffic)', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      prisma.$runCommandRaw.mockRejectedValue(new Error('timeout'));
      await expect(appController.health()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
