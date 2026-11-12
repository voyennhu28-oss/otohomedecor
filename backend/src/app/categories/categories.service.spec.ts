import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  createPrismaServiceMock,
  PrismaModelMock,
} from '../../../test/mocks/prisma.mock';
import { StringUtilService } from '../../common/utils/string-util/string-util.service';
import { CategoriesService } from './categories.service';

// Cây mẫu:  phong-khach ─┬─ sofa ── sofa-goc
//                        └─ ban-tra
//           phong-ngu (đang ẩn) ── giuong
const cat = (id: string, slug: string, parentID: string | null = null) => ({
  id,
  name: slug,
  slug,
  description: null,
  imageUrl: null,
  parentID,
  sortOrder: 0,
});
const PK = cat('pk', 'phong-khach');
const SOFA = cat('sofa', 'sofa', 'pk');
const SOFA_GOC = cat('sofa-goc', 'sofa-goc', 'sofa');
const BAN_TRA = cat('ban-tra', 'ban-tra', 'pk');
const GIUONG = cat('giuong', 'giuong', 'pn'); // cha "pn" đang ẩn nên không có trong danh sách active
const ACTIVE = [PK, SOFA, SOFA_GOC, BAN_TRA, GIUONG];

describe('CategoriesService', () => {
  let service: CategoriesService;
  let model: PrismaModelMock;

  beforeEach(() => {
    const { prismaService, modelMock } = createPrismaServiceMock('category');
    model = modelMock;
    service = new CategoriesService(prismaService, new StringUtilService());
  });

  describe('public', () => {
    beforeEach(() => model.findMany.mockResolvedValue(ACTIVE));

    it('getPublicTree: dựng cây lồng nhau, chỉ lấy danh mục đang hiển thị', async () => {
      const tree = await service.getPublicTree();

      expect(model.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
      expect(tree.map((c) => c.slug)).toEqual(['phong-khach']); // "giuong" bị bỏ vì cha đang ẩn
      expect(tree[0].children.map((c) => c.slug)).toEqual(['sofa', 'ban-tra']);
      expect(tree[0].children[0].children.map((c) => c.slug)).toEqual(['sofa-goc']);
    });

    it('getPublicBySlug: kèm breadcrumb từ gốc và danh mục con', async () => {
      const result = await service.getPublicBySlug('sofa');
      expect(result.breadcrumb.map((c) => c.slug)).toEqual(['phong-khach', 'sofa']);
      expect(result.children.map((c) => c.slug)).toEqual(['sofa-goc']);
    });

    it('getPublicBySlug: 404 khi slug không có hoặc một tổ tiên đang ẩn', async () => {
      await expect(service.getPublicBySlug('khong-co')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getPublicBySlug('giuong')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('getActiveIDsWithDescendants: gồm cả con cháu; rỗng khi không hiển thị', async () => {
      await expect(service.getActiveIDsWithDescendants('phong-khach')).resolves.toEqual([
        'pk',
        'sofa',
        'ban-tra',
        'sofa-goc',
      ]);
      await expect(service.getActiveIDsWithDescendants('giuong')).resolves.toEqual([]);
      await expect(service.getActiveIDsWithDescendants('khong-co')).resolves.toEqual([]);
    });
  });

  describe('getAdminTree', () => {
    it('cây đầy đủ kèm productCount, chỉ đếm sản phẩm chưa xóa', async () => {
      model.findMany.mockResolvedValue([
        { ...PK, isActive: true, _count: { products: 0, children: 1 } },
        { ...SOFA, isActive: false, _count: { products: 3, children: 0 } },
      ]);
      const tree = await service.getAdminTree();
      expect(tree[0].children[0]).toMatchObject({ slug: 'sofa', isActive: false, productCount: 3 });
      expect(tree[0]).not.toHaveProperty('_count');
      const include = model.findMany.mock.calls[0][0].include;
      expect(include._count.select.products.where).toEqual({
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      });
    });
  });

  describe('create', () => {
    it('tự sinh slug từ tên tiếng Việt', async () => {
      model.findMany.mockResolvedValue([]); // chưa có slug nào trùng
      model.create.mockImplementation(({ data }) => data);
      const created = await service.create({ name: 'Bàn trà' });
      expect(created.slug).toBe('ban-tra');
    });

    it('slug đã có (kể cả của danh mục đã xóa) thì thêm hậu tố -2, -3', async () => {
      model.findMany.mockResolvedValue([{ slug: 'ban-tra' }, { slug: 'ban-tra-2' }, { slug: 'ban-tra-go' }]);
      model.create.mockImplementation(({ data }) => data);
      const created = await service.create({ name: 'Bàn trà' });
      expect(created.slug).toBe('ban-tra-3');
      expect(model.findMany).toHaveBeenCalledWith({
        where: { slug: { startsWith: 'ban-tra' } },
        select: { slug: true },
      });
    });

    it('slug tự nhập đã được dùng → 409', async () => {
      model.findUnique.mockResolvedValue({ id: 'other' });
      await expect(service.create({ name: 'X', slug: 'sofa' })).rejects.toBeInstanceOf(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('danh mục cha không tồn tại → 404', async () => {
      model.findMany.mockResolvedValue([{ id: 'pk', parentID: null }]);
      await expect(
        service.create({ name: 'X', parentID: 'aaaaaaaaaaaaaaaaaaaaaaaa' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    const ALL = [PK, SOFA, SOFA_GOC, BAN_TRA].map(({ id, parentID }) => ({ id, parentID }));

    beforeEach(() => {
      model.findUnique.mockResolvedValue({ slug: 'sofa' });
      model.findMany.mockResolvedValue(ALL);
      model.update.mockImplementation(({ data }) => data);
    });

    it('chọn chính nó làm cha → 400', async () => {
      await expect(service.update('sofa', { parentID: 'sofa' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('chuyển vào danh mục con cháu của nó (tạo vòng lặp) → 400', async () => {
      await expect(service.update('pk', { parentID: 'sofa-goc' })).rejects.toBeInstanceOf(BadRequestException);
      expect(model.update).not.toHaveBeenCalled();
    });

    it('chuyển sang nhánh khác hợp lệ', async () => {
      await service.update('sofa', { parentID: 'ban-tra' });
      expect(model.update).toHaveBeenCalledWith({ where: { id: 'sofa' }, data: { parentID: 'ban-tra' } });
    });

    it('parentID null: chuyển lên làm gốc, không cần kiểm tra cha', async () => {
      await service.update('sofa', { parentID: null });
      expect(model.findMany).not.toHaveBeenCalled();
      expect(model.update).toHaveBeenCalledWith({ where: { id: 'sofa' }, data: { parentID: null } });
    });

    it('đổi slug sang slug của danh mục khác → 409; giữ slug cũ thì không kiểm tra', async () => {
      model.findUnique.mockResolvedValueOnce({ slug: 'sofa' }).mockResolvedValueOnce({ id: 'ban-tra' });
      await expect(service.update('sofa', { slug: 'ban-tra' })).rejects.toBeInstanceOf(ConflictException);

      model.findUnique.mockReset().mockResolvedValue({ slug: 'sofa' });
      await service.update('sofa', { slug: 'sofa', name: 'Sofa mới' });
      expect(model.findUnique).toHaveBeenCalledTimes(1);
    });

    it('không tồn tại → 404', async () => {
      model.findUnique.mockResolvedValue(null);
      await expect(service.update('x', { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    const withCount = (products: number, children: number) => ({
      id: 'sofa',
      slug: 'sofa',
      _count: { products, children },
    });

    it('còn danh mục con → 409', async () => {
      model.findUnique.mockResolvedValue(withCount(0, 2));
      await expect(service.remove('sofa')).rejects.toBeInstanceOf(ConflictException);
      expect(model.update).not.toHaveBeenCalled();
    });

    it('còn sản phẩm → 409', async () => {
      model.findUnique.mockResolvedValue(withCount(5, 0));
      await expect(service.remove('sofa')).rejects.toThrow('5 sản phẩm');
    });

    it('trống: soft delete và đổi slug để giải phóng slug cũ', async () => {
      model.findUnique.mockResolvedValue(withCount(0, 0));
      await expect(service.remove('sofa')).resolves.toEqual({ id: 'sofa' });
      expect(model.update).toHaveBeenCalledWith({
        where: { id: 'sofa' },
        data: { deletedAt: expect.any(Date), slug: 'sofa--deleted-sofa' },
      });
    });

    it('không tồn tại → 404', async () => {
      model.findUnique.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
