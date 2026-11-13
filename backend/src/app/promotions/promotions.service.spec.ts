import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PromotionType } from '@prisma/client';
import { createPrismaModelMock, PrismaModelMock } from '../../../test/mocks/prisma.mock';
import { NOT_DELETED, PrismaService } from '../../common/prisma/prisma.service';
import { CreatePromotionDto } from './dto/promotion.dto';
import { PromotionsService } from './promotions.service';

const DAY = 86_400_000;
const running = () => ({
  id: 'p1',
  code: 'WELCOME10',
  type: PromotionType.percentage,
  value: 10,
  maxDiscount: 500_000,
  minOrderValue: 0,
  usageLimit: 100,
  usedCount: 3,
  perUserLimit: null as number | null,
  startsAt: new Date(Date.now() - DAY),
  endsAt: null,
  isActive: true,
});

describe('PromotionsService', () => {
  let service: PromotionsService;
  let promotion: PrismaModelMock;

  beforeEach(() => {
    promotion = createPrismaModelMock();
    promotion.create.mockImplementation(({ data }) => Promise.resolve(data));
    promotion.update.mockImplementation(({ data }) => Promise.resolve(data));
    service = new PromotionsService({ promotion, extended: { promotion } } as unknown as PrismaService);
  });

  describe('admin CRUD', () => {
    const dto = CreatePromotionDto.schema.parse({ code: 'freeship', name: 'Free ship', type: 'free_shipping', value: 99, maxDiscount: 5 });

    it('DTO: viết hoa mã, mặc định đang bật', () => {
      expect(dto).toMatchObject({ code: 'FREESHIP', isActive: true, minOrderValue: 0 });
    });

    it('DTO: từ chối cấu hình sai (% > 100, endsAt trước startsAt, mã có ký tự lạ)', () => {
      const base = { code: 'SALE', name: 'x', type: 'percentage' };
      expect(CreatePromotionDto.schema.safeParse({ ...base, value: 150 }).success).toBe(false);
      expect(
        CreatePromotionDto.schema.safeParse({ ...base, value: 10, startsAt: '2026-12-01', endsAt: '2026-11-01' }).success,
      ).toBe(false);
      expect(CreatePromotionDto.schema.safeParse({ ...base, value: 10, code: 'giảm giá' }).success).toBe(false);
    });

    it('create: chuẩn hóa free_shipping (value 0, không có maxDiscount)', async () => {
      promotion.findUnique.mockResolvedValue(null);
      await expect(service.create(dto)).resolves.toMatchObject({ code: 'FREESHIP', value: 0, maxDiscount: null });
    });

    it('create: mã đã tồn tại (kể cả mã đã xóa) → 409', async () => {
      promotion.findUnique.mockResolvedValue({ id: 'x' });
      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('update: kiểm tra rule trên giá trị SAU khi gộp với dữ liệu hiện tại', async () => {
      promotion.findUnique.mockResolvedValue(running());
      await expect(service.update('p1', { usageLimit: 2 })).rejects.toThrow(/nhỏ hơn số lượt đã dùng \(3\)/);
      await expect(service.update('p1', { value: 120 })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.update('p1', { value: 20 })).resolves.toEqual({ value: 20 });
    });

    it('update: đổi sang mã đã có → 409; đổi loại thì chuẩn hóa lại', async () => {
      promotion.findUnique.mockResolvedValueOnce(running()).mockResolvedValueOnce({ id: 'other' });
      await expect(service.update('p1', { code: 'SALE50' })).rejects.toBeInstanceOf(ConflictException);

      promotion.findUnique.mockResolvedValue(running());
      await expect(service.update('p1', { type: PromotionType.fixed_amount, value: 100_000 })).resolves.toEqual({
        type: 'fixed_amount',
        value: 100_000,
        maxDiscount: null,
      });
    });

    it('remove: soft delete + đổi code để dùng lại được mã', async () => {
      promotion.findUnique.mockResolvedValue(running());
      await expect(service.remove('p1')).resolves.toEqual({ id: 'p1' });
      expect(promotion.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { deletedAt: expect.any(Date), code: 'WELCOME10--deleted-p1' },
      });
    });

    it('findOne: 404; findList: tìm theo mã hoặc tên, count cùng where', async () => {
      promotion.findUnique.mockResolvedValue(null);
      await expect(service.findOne('x')).rejects.toBeInstanceOf(NotFoundException);

      promotion.findMany.mockResolvedValue([]);
      promotion.count.mockResolvedValue(0);
      await service.findList({ q: 'sale', isActive: true, page: 1, itemPerPage: 20 });
      const args = promotion.findMany.mock.calls[0][0];
      expect(args.where).toMatchObject({ isActive: true, OR: expect.any(Array) });
      expect(promotion.count).toHaveBeenCalledWith({ where: args.where });
    });
  });

  describe('checkout', () => {
    const countUserUsage = jest.fn();

    beforeEach(() => countUserUsage.mockReset());

    it('findApplicable: tìm theo mã viết hoa, chưa xóa', async () => {
      promotion.findFirst.mockResolvedValue(running());
      await expect(service.findApplicable(' welcome10 ', { subtotal: 1_000_000, countUserUsage })).resolves.toMatchObject({
        id: 'p1',
      });
      expect(promotion.findFirst).toHaveBeenCalledWith({ where: { code: 'WELCOME10', ...NOT_DELETED } });
      expect(countUserUsage).not.toHaveBeenCalled(); // mã không giới hạn theo user
    });

    it('findApplicable: mã không tồn tại → 400', async () => {
      promotion.findFirst.mockResolvedValue(null);
      await expect(service.findApplicable('XXX', { subtotal: 1, countUserUsage })).rejects.toThrow('Mã giảm giá không tồn tại');
    });

    it('findApplicable: có perUserLimit thì đếm lượt của user; dùng hết → 400', async () => {
      promotion.findFirst.mockResolvedValue({ ...running(), perUserLimit: 1 });
      countUserUsage.mockResolvedValue(1);
      await expect(service.findApplicable('WELCOME10', { subtotal: 1, countUserUsage })).rejects.toThrow(/Bạn đã dùng hết/);
      expect(countUserUsage).toHaveBeenCalledWith('p1');
    });

    it('consume: tăng usedCount ATOMIC có điều kiện còn lượt; hết lượt → 409', async () => {
      const tx = { promotion: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
      await service.consume({ id: 'p1', usageLimit: 100 }, tx as never);
      expect(tx.promotion.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1', usedCount: { lt: 100 } },
        data: { usedCount: { increment: 1 } },
      });

      tx.promotion.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.consume({ id: 'p1', usageLimit: 100 }, tx as never)).rejects.toBeInstanceOf(ConflictException);
    });

    it('consume: mã không giới hạn lượt thì không có điều kiện usedCount', async () => {
      const tx = { promotion: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
      await service.consume({ id: 'p1', usageLimit: null }, tx as never);
      expect(tx.promotion.updateMany.mock.calls[0][0].where).toEqual({ id: 'p1' });
    });

    it('release: trả 1 lượt, không xuống dưới 0', async () => {
      const tx = { promotion: { updateMany: jest.fn() } };
      await service.release('p1', tx as never);
      expect(tx.promotion.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1', usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    });
  });
});
