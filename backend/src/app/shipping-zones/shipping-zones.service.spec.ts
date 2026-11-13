import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createPrismaModelMock, PrismaModelMock } from '../../../test/mocks/prisma.mock';
import { PROVINCES } from '../../common/constants/catalog.const';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateShippingZoneDto } from './dto/shipping-zone.dto';
import { ShippingZonesService } from './shipping-zones.service';

describe('ShippingZonesService', () => {
  let service: ShippingZonesService;
  let zone: PrismaModelMock;

  const dto = CreateShippingZoneDto.schema.parse({
    name: 'Miền Nam',
    provinces: ['Đồng Nai', 'Tây Ninh', 'Đồng Nai'],
    baseFee: 40_000,
    baseWeightKg: 5,
    feePerKg: 6_000,
    estimatedDays: 3,
  });

  beforeEach(() => {
    zone = createPrismaModelMock();
    zone.create.mockImplementation(({ data }) => Promise.resolve(data));
    zone.update.mockImplementation(({ data }) => Promise.resolve(data));
    service = new ShippingZonesService({ shippingZone: zone, extended: { shippingZone: zone } } as unknown as PrismaService);
  });

  it('DTO: bỏ tỉnh trùng, tỉnh phải nằm trong danh sách 34 tỉnh', () => {
    expect(dto).toMatchObject({ provinces: ['Đồng Nai', 'Tây Ninh'], isActive: true, bulkySurcharge: 0 });
    expect(CreateShippingZoneDto.schema.safeParse({ ...dto, provinces: ['Bình Dương'] }).success).toBe(false); // đã sáp nhập
  });

  it('create: tỉnh đã thuộc vùng khác đang hoạt động → 409 nêu rõ tỉnh và vùng', async () => {
    zone.findMany.mockResolvedValue([{ name: 'Miền Đông', provinces: ['Đồng Nai', 'Hồ Chí Minh'] }]);
    await expect(service.create(dto)).rejects.toThrow(new ConflictException('Tỉnh đã thuộc vùng khác đang hoạt động: Đồng Nai (vùng "Miền Đông")'));
    expect(zone.findMany.mock.calls[0][0].where).toEqual({ isActive: true, provinces: { hasSome: ['Đồng Nai', 'Tây Ninh'] } });
  });

  it('create: không trùng thì tạo; vùng tắt thì không cần kiểm tra trùng', async () => {
    zone.findMany.mockResolvedValue([]);
    await expect(service.create(dto)).resolves.toMatchObject({ name: 'Miền Nam' });
    zone.findMany.mockClear();
    await service.create({ ...dto, isActive: false });
    expect(zone.findMany).not.toHaveBeenCalled();
  });

  it('update: đổi tỉnh / bật lại vùng thì kiểm tra trùng (trừ chính nó); sửa phí thì không', async () => {
    zone.findUnique.mockResolvedValue({ id: 'z1', isActive: false, provinces: ['Cà Mau'] });
    zone.findMany.mockResolvedValue([]);

    await service.update('z1', { isActive: true });
    expect(zone.findMany.mock.calls[0][0].where).toMatchObject({ provinces: { hasSome: ['Cà Mau'] }, id: { not: 'z1' } });

    zone.findMany.mockClear();
    await service.update('z1', { baseFee: 1 });
    expect(zone.findMany).not.toHaveBeenCalled();
  });

  it('findOne / remove: 404 khi không có; remove xóa cứng', async () => {
    zone.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('x')).rejects.toBeInstanceOf(NotFoundException);
    zone.findUnique.mockResolvedValueOnce({ id: 'z1' });
    await expect(service.remove('z1')).resolves.toEqual({ id: 'z1' });
    expect(zone.delete).toHaveBeenCalledWith({ where: { id: 'z1' } });
  });

  it('findForProvince: vùng đang hoạt động chứa tỉnh; không có → 400', async () => {
    zone.findFirst.mockResolvedValueOnce({ id: 'z1' }).mockResolvedValueOnce(null);
    await expect(service.findForProvince('Cà Mau')).resolves.toEqual({ id: 'z1' });
    expect(zone.findFirst).toHaveBeenCalledWith({ where: { isActive: true, provinces: { has: 'Cà Mau' } } });
    await expect(service.findForProvince('Lai Châu')).rejects.toThrow(new BadRequestException('Chưa hỗ trợ giao hàng tới Lai Châu'));
  });

  it('listProvinces: đủ 34 tỉnh, đánh dấu tỉnh đang giao được', async () => {
    zone.findMany.mockResolvedValue([{ provinces: ['Hà Nội'] }, { provinces: ['Hồ Chí Minh'] }]);
    const list = await service.listProvinces();
    expect(list).toHaveLength(34);
    expect(PROVINCES).toHaveLength(34);
    expect(list.filter((p) => p.supported).map((p) => p.name)).toEqual(['Hà Nội', 'Hồ Chí Minh']);
  });
});
