import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import {
  createPrismaServiceMock,
  PrismaModelMock,
} from '../../../test/mocks/prisma.mock';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StringUtilService } from '../../common/utils/string-util/string-util.service';
import { visibleCollectionWhere } from './collection.util';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

const ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbb';

describe('CollectionsService', () => {
  let service: CollectionsService;
  let model: PrismaModelMock;
  let prismaService: PrismaService;

  beforeEach(() => {
    ({ prismaService, modelMock: model } =
      createPrismaServiceMock('collection'));
    Object.assign(prismaService, {
      $transaction: jest.fn((fn: (tx: unknown) => unknown) =>
        fn(prismaService),
      ),
    });
    service = new CollectionsService(prismaService, new StringUtilService());
  });

  describe('visibleCollectionWhere', () => {
    it('đang bật, đã tới startsAt (hoặc không có), chưa tới endsAt (hoặc không có)', () => {
      const now = new Date('2026-11-18T00:00:00Z');
      expect(visibleCollectionWhere(now)).toEqual({
        AND: [
          { isActive: true },
          {
            OR: [
              { startsAt: null },
              { startsAt: { isSet: false } },
              { startsAt: { lte: now } },
            ],
          },
          {
            OR: [
              { endsAt: null },
              { endsAt: { isSet: false } },
              { endsAt: { gt: now } },
            ],
          },
        ],
      });
    });
  });

  describe('public', () => {
    it('findPublicList: chỉ lấy bộ sưu tập đang hiển thị, lọc featured nếu có', async () => {
      model.findMany.mockResolvedValue([]);
      await service.findPublicList(true);

      const { where } = model.findMany.mock.calls[0][0];
      expect(where.AND[0].AND[0]).toEqual({ isActive: true });
      expect(where.AND[1]).toEqual({ isFeatured: true });
    });

    it('findPublicBySlug: 404 khi không có / đang ẩn', async () => {
      model.findFirst.mockResolvedValue(null);
      await expect(service.findPublicBySlug('ha-long')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('getVisibleIDBySlug: null khi không có', async () => {
      model.findFirst.mockResolvedValue(null);
      await expect(service.getVisibleIDBySlug('x')).resolves.toBeNull();
      model.findFirst.mockResolvedValue({ id: ID });
      await expect(service.getVisibleIDBySlug('ha-long')).resolves.toBe(ID);
    });

    it('findVisibleByIDs / findByIDs: mảng rỗng thì không truy vấn', async () => {
      await expect(service.findVisibleByIDs([])).resolves.toEqual([]);
      await expect(service.findByIDs([])).resolves.toEqual([]);
      expect(model.findMany).not.toHaveBeenCalled();
    });
  });

  describe('ensureAllExist', () => {
    it('đủ ID (bỏ trùng) thì qua', async () => {
      model.findMany.mockResolvedValue([{ id: ID }]);
      await expect(service.ensureAllExist([ID, ID])).resolves.toBeUndefined();
      expect(model.findMany.mock.calls[0][0].where).toEqual({
        id: { in: [ID] },
      });
    });

    it('thiếu ID thì 404, nêu ID bị thiếu', async () => {
      model.findMany.mockResolvedValue([{ id: ID }]);
      await expect(service.ensureAllExist([ID, OTHER])).rejects.toThrow(OTHER);
    });

    it('mảng rỗng thì không truy vấn', async () => {
      await service.ensureAllExist([]);
      expect(model.findMany).not.toHaveBeenCalled();
    });
  });

  describe('admin', () => {
    it('create: không gửi slug thì sinh từ name, tránh slug đã có', async () => {
      model.findMany.mockResolvedValue([{ slug: 'ha-long' }]);
      model.create.mockImplementation(({ data }) => Promise.resolve(data));

      const created = await service.create(
        CreateCollectionDto.schema.parse({ name: 'Hạ Long' }),
      );
      expect(created.slug).toBe('ha-long-2');
    });

    it('create: slug đã dùng (kể cả bản ghi đã xóa) → 409', async () => {
      model.findUnique.mockResolvedValue({ id: OTHER });
      await expect(
        service.create(
          CreateCollectionDto.schema.parse({ name: 'X', slug: 'ha-long' }),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('update: kiểm tra khoảng thời gian với giá trị đang lưu', async () => {
      model.findUnique.mockResolvedValue({
        id: ID,
        slug: 'tet',
        startsAt: new Date('2027-01-10'),
        endsAt: null,
      });
      await expect(
        service.update(
          ID,
          UpdateCollectionDto.schema.parse({ endsAt: '2027-01-01' }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(model.update).not.toHaveBeenCalled();
    });

    it('update: gửi startsAt null thì bỏ giới hạn, không báo lỗi', async () => {
      model.findUnique.mockResolvedValue({
        id: ID,
        slug: 'tet',
        startsAt: new Date('2027-01-10'),
        endsAt: new Date('2027-02-10'),
      });
      await service.update(
        ID,
        UpdateCollectionDto.schema.parse({ startsAt: null }),
      );
      expect(model.update).toHaveBeenCalledWith({
        where: { id: ID },
        data: { startsAt: null },
      });
    });

    it('remove: soft delete và đổi slug để giải phóng', async () => {
      model.findUnique.mockResolvedValue({ id: ID, slug: 'ha-long' });
      await expect(service.remove(ID)).resolves.toEqual({ id: ID });
      expect(model.update).toHaveBeenCalledWith({
        where: { id: ID },
        data: {
          deletedAt: expect.any(Date),
          slug: `ha-long--deleted-${ID}`,
        },
      });
    });

    it('setImage: trả về ảnh cũ để xóa trên Cloudinary', async () => {
      const previous = {
        url: 'old',
        publicID: 'old-id',
        alt: null,
        sortOrder: 0,
      };
      model.findFirst.mockResolvedValue({ image: previous });
      model.update.mockResolvedValue({ id: ID });

      const result = await service.setImage(ID, {
        url: 'new',
        publicID: 'new-id',
      });

      expect(result.previous).toEqual(previous);
      expect(model.update).toHaveBeenCalledWith({
        where: { id: ID },
        data: {
          image: {
            set: { url: 'new', publicID: 'new-id', alt: null, sortOrder: 0 },
          },
        },
      });
    });

    it('setImage(null): bỏ ảnh bìa', async () => {
      model.findFirst.mockResolvedValue({ image: null });
      await service.setImage(ID, null);
      expect(model.update).toHaveBeenCalledWith({
        where: { id: ID },
        data: { image: { unset: true } },
      });
    });
  });

  describe('DTO', () => {
    it('từ chối endsAt trước hoặc bằng startsAt', () => {
      expect(() =>
        CreateCollectionDto.schema.parse({
          name: 'Tết',
          startsAt: '2027-02-01',
          endsAt: '2027-01-01',
        }),
      ).toThrow(ZodError);
    });

    it('không nhận field lạ (vd image phải upload riêng)', () => {
      expect(() =>
        CreateCollectionDto.schema.parse({ name: 'X', image: { url: 'a' } }),
      ).toThrow(ZodError);
    });
  });
});
