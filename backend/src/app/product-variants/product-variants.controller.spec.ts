import { AutoMockingModule } from '../../../test/auto-mocking/auto-mocking.module';
import { IS_ADMIN_ONLY } from '../../common/decorators/admin-only.decorator';
import { AdminProductVariantsController } from './admin-product-variants.controller';
import { UpdateStockDto, UpdateVariantDto } from './dto/variant.dto';
import { ProductVariantsService } from './product-variants.service';

const P = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const V = 'bbbbbbbbbbbbbbbbbbbbbbbb';

describe('AdminProductVariantsController', () => {
  let controller: AdminProductVariantsController;
  let service: jest.Mocked<ProductVariantsService>;

  beforeEach(async () => {
    const module = await AutoMockingModule.createTestingModule({
      controllers: [AdminProductVariantsController],
    });
    controller = module.get(AdminProductVariantsController);
    service = module.get(ProductVariantsService);
  });

  it('@AdminOnly() ở cấp class', () => {
    expect(Reflect.getMetadata(IS_ADMIN_ONLY, AdminProductVariantsController)).toBe(true);
  });

  it('chuyển đúng tham số cho service', async () => {
    await controller.findByProduct({ productID: P });
    expect(service.findByProduct).toHaveBeenCalledWith(P);

    await controller.update({ productID: P, variantID: V }, { price: 1 });
    expect(service.update).toHaveBeenCalledWith(P, V, { price: 1 });

    await controller.remove({ productID: P, variantID: V });
    expect(service.remove).toHaveBeenCalledWith(P, V);

    await controller.updateStock({ variantID: V }, { adjust: -2 });
    expect(service.updateStock).toHaveBeenCalledWith(V, { adjust: -2 });
  });
});

describe('DTO variant', () => {
  it('UpdateStockDto: phải gửi đúng 1 trong 2 "stock" / "adjust"', () => {
    const parse = (body: unknown) => UpdateStockDto.schema.safeParse(body).success;
    expect(parse({ stock: 10 })).toBe(true);
    expect(parse({ adjust: -3 })).toBe(true);
    expect(parse({})).toBe(false);
    expect(parse({ stock: 10, adjust: 1 })).toBe(false);
    expect(parse({ adjust: 0 })).toBe(false);
    expect(parse({ stock: -1 })).toBe(false);
  });

  it('UpdateVariantDto: field không gửi KHÔNG bị gán giá trị mặc định (không ghi đè dữ liệu cũ)', () => {
    const result = UpdateVariantDto.schema.parse({ price: 1_000_000 });
    expect(result).toEqual({ price: 1_000_000 }); // không có isActive: true, options: [], weightKg: 0
  });

  it('UpdateVariantDto: không sửa tồn kho ở đây', () => {
    expect(UpdateVariantDto.schema.safeParse({ stock: 5 }).success).toBe(false);
  });
});
