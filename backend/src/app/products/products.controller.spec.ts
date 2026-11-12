import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AutoMockingModule } from '../../../test/auto-mocking/auto-mocking.module';
import { IS_ADMIN_ONLY } from '../../common/decorators/admin-only.decorator';
import { IS_PUBLIC } from '../../common/decorators/public.decorator';
import { AdminProductsController } from './admin-products.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

const ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

describe('ProductsController (public)', () => {
  let controller: ProductsController;
  let service: jest.Mocked<ProductsService>;

  beforeEach(async () => {
    const module = await AutoMockingModule.createTestingModule({
      controllers: [ProductsController],
    });
    controller = module.get(ProductsController);
    service = module.get(ProductsService);
  });

  it('@Public() ở cấp class', () => {
    expect(Reflect.getMetadata(IS_PUBLIC, ProductsController)).toBe(true);
  });

  it('route "featured" và "filters" khai báo trước ":slug"', () => {
    const getPaths = Object.getOwnPropertyNames(ProductsController.prototype)
      .map((name) => (ProductsController.prototype as any)[name])
      .filter((handler) => Reflect.getMetadata(METHOD_METADATA, handler) === RequestMethod.GET)
      .map((handler) => Reflect.getMetadata(PATH_METADATA, handler));
    expect(getPaths.indexOf('featured')).toBeLessThan(getPaths.indexOf(':slug'));
    expect(getPaths.indexOf('filters')).toBeLessThan(getPaths.indexOf(':slug'));
  });

  it('chuyển đúng tham số cho service', async () => {
    const query = { sort: 'newest' as const, page: 1, itemPerPage: 20 };
    await controller.findList(query);
    expect(service.findPublicList).toHaveBeenCalledWith(query);

    await controller.findFeatured({ limit: 8 });
    expect(service.findFeatured).toHaveBeenCalledWith(8);

    await controller.getFilterOptions({ category: 'sofa' });
    expect(service.getFilterOptions).toHaveBeenCalledWith('sofa');

    await controller.findBySlug({ slug: 'sofa-bang' });
    expect(service.findPublicBySlug).toHaveBeenCalledWith('sofa-bang');

    await controller.findRelated({ slug: 'sofa-bang' }, { limit: 4 });
    expect(service.findRelated).toHaveBeenCalledWith('sofa-bang', 4);
  });
});

describe('AdminProductsController', () => {
  let controller: AdminProductsController;
  let service: jest.Mocked<ProductsService>;

  beforeEach(async () => {
    const module = await AutoMockingModule.createTestingModule({
      controllers: [AdminProductsController],
    });
    controller = module.get(AdminProductsController);
    service = module.get(ProductsService);
  });

  it('@AdminOnly() ở cấp class, không route nào @Public', () => {
    expect(Reflect.getMetadata(IS_ADMIN_ONLY, AdminProductsController)).toBe(true);
    for (const name of Object.getOwnPropertyNames(AdminProductsController.prototype)) {
      expect(Reflect.getMetadata(IS_PUBLIC, (AdminProductsController.prototype as any)[name])).toBeUndefined();
    }
  });

  it('chuyển đúng tham số cho service', async () => {
    await controller.findList({ page: 1, itemPerPage: 20 });
    expect(service.findAdminList).toHaveBeenCalledWith({ page: 1, itemPerPage: 20 });

    await controller.findOne({ id: ID });
    expect(service.findAdminByID).toHaveBeenCalledWith(ID);

    await controller.update({ id: ID }, { isFeatured: true });
    expect(service.update).toHaveBeenCalledWith(ID, { isFeatured: true });

    await controller.remove({ id: ID });
    expect(service.remove).toHaveBeenCalledWith(ID);
  });
});
