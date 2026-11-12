import { AutoMockingModule } from '../../../test/auto-mocking/auto-mocking.module';
import { IS_ADMIN_ONLY } from '../../common/decorators/admin-only.decorator';
import { IS_PUBLIC } from '../../common/decorators/public.decorator';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

const ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

describe('CategoriesController (public)', () => {
  let controller: CategoriesController;
  let service: jest.Mocked<CategoriesService>;

  beforeEach(async () => {
    const module = await AutoMockingModule.createTestingModule({
      controllers: [CategoriesController],
    });
    controller = module.get(CategoriesController);
    service = module.get(CategoriesService);
  });

  it('@Public() ở cấp class: khách xem được', () => {
    expect(Reflect.getMetadata(IS_PUBLIC, CategoriesController)).toBe(true);
    expect(Reflect.getMetadata(IS_ADMIN_ONLY, CategoriesController)).toBeUndefined();
  });

  it('getTree', async () => {
    service.getPublicTree.mockResolvedValue([]);
    await expect(controller.getTree()).resolves.toEqual([]);
  });

  it('getBySlug: lấy slug từ param', async () => {
    service.getPublicBySlug.mockResolvedValue({ slug: 'sofa' } as any);
    await controller.getBySlug({ slug: 'sofa' });
    expect(service.getPublicBySlug).toHaveBeenCalledWith('sofa');
  });
});

describe('AdminCategoriesController', () => {
  let controller: AdminCategoriesController;
  let service: jest.Mocked<CategoriesService>;

  beforeEach(async () => {
    const module = await AutoMockingModule.createTestingModule({
      controllers: [AdminCategoriesController],
    });
    controller = module.get(AdminCategoriesController);
    service = module.get(CategoriesService);
  });

  it('@AdminOnly() ở cấp class, không route nào @Public', () => {
    expect(Reflect.getMetadata(IS_ADMIN_ONLY, AdminCategoriesController)).toBe(true);
    for (const method of Object.getOwnPropertyNames(AdminCategoriesController.prototype)) {
      const handler = (AdminCategoriesController.prototype as any)[method];
      expect(Reflect.getMetadata(IS_PUBLIC, handler)).toBeUndefined();
    }
  });

  it('chuyển đúng tham số cho service', async () => {
    await controller.getTree();
    expect(service.getAdminTree).toHaveBeenCalled();

    await controller.findOne({ id: ID });
    expect(service.findOne).toHaveBeenCalledWith(ID);

    await controller.create({ name: 'Sofa' });
    expect(service.create).toHaveBeenCalledWith({ name: 'Sofa' });

    await controller.update({ id: ID }, { isActive: false });
    expect(service.update).toHaveBeenCalledWith(ID, { isActive: false });

    await controller.remove({ id: ID });
    expect(service.remove).toHaveBeenCalledWith(ID);
  });
});
