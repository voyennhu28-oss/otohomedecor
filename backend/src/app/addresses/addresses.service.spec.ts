import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createPrismaModelMock, PrismaModelMock } from '../../../test/mocks/prisma.mock';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddressesService, MAX_ADDRESSES_PER_USER } from './addresses.service';
import { CreateAddressDto } from './dto/address.dto';

const dto = (overrides: Partial<CreateAddressDto> = {}): CreateAddressDto => ({
  fullName: 'Nguyễn An',
  phone: '0901234567',
  province: 'Hà Nội',
  ward: 'Phường Hoàn Kiếm',
  street: '1 Tràng Tiền',
  isDefault: false,
  ...overrides,
});

describe('AddressesService', () => {
  let service: AddressesService;
  let address: PrismaModelMock;
  let transaction: jest.Mock;

  beforeEach(() => {
    address = createPrismaModelMock();
    address.create.mockImplementation(({ data }) => Promise.resolve({ id: 'new', ...data }));
    address.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
    const prisma = { address, extended: { address } } as unknown as PrismaService;
    transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(prisma));
    Object.assign(prisma, { $transaction: transaction });
    service = new AddressesService(prisma);
  });

  it('findMine: chỉ địa chỉ của user, mặc định lên đầu', async () => {
    address.findMany.mockResolvedValue([]);
    await service.findMine('u1');
    expect(address.findMany).toHaveBeenCalledWith({
      where: { userID: 'u1' },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  });

  describe('create', () => {
    it('địa chỉ đầu tiên luôn là mặc định', async () => {
      address.count.mockResolvedValue(0);
      await expect(service.create('u1', dto())).resolves.toMatchObject({ userID: 'u1', isDefault: true });
    });

    it('địa chỉ thêm sau: không mặc định trừ khi chọn', async () => {
      address.count.mockResolvedValue(2);
      await expect(service.create('u1', dto())).resolves.toMatchObject({ isDefault: false });
      expect(address.updateMany).not.toHaveBeenCalled();
    });

    it('chọn làm mặc định → bỏ mặc định ở các địa chỉ khác (cùng transaction)', async () => {
      address.count.mockResolvedValue(2);
      await service.create('u1', dto({ isDefault: true }));
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(address.updateMany).toHaveBeenCalledWith({ where: { userID: 'u1', isDefault: true }, data: { isDefault: false } });
      expect(address.create.mock.calls[0][0].data).toMatchObject({ isDefault: true, userID: 'u1' });
    });

    it(`tối đa ${MAX_ADDRESSES_PER_USER} địa chỉ → 400`, async () => {
      address.count.mockResolvedValue(MAX_ADDRESSES_PER_USER);
      await expect(service.create('u1', dto())).rejects.toBeInstanceOf(BadRequestException);
      expect(address.create).not.toHaveBeenCalled();
    });
  });

  describe('update / setDefault / remove', () => {
    it('update: chỉ sửa địa chỉ của chính user; của người khác → 404', async () => {
      address.findFirst.mockResolvedValueOnce({ id: 'a1' }).mockResolvedValueOnce(null);
      await service.update('u1', 'a1', { street: '2 Tràng Tiền' });
      expect(address.findFirst).toHaveBeenCalledWith({ where: { id: 'a1', userID: 'u1' } });
      expect(address.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { street: '2 Tràng Tiền' } });

      await expect(service.update('u1', 'a2', { street: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('setDefault: bỏ mặc định các địa chỉ khác rồi đặt địa chỉ này', async () => {
      address.findFirst.mockResolvedValue({ id: 'a1' });
      await expect(service.setDefault('u1', 'a1')).resolves.toMatchObject({ id: 'a1', isDefault: true });
      expect(address.updateMany).toHaveBeenCalledWith({
        where: { userID: 'u1', isDefault: true, id: { not: 'a1' } },
        data: { isDefault: false },
      });
    });

    it('setDefault: địa chỉ của người khác → 404, không ghi', async () => {
      address.findFirst.mockResolvedValue(null);
      await expect(service.setDefault('u1', 'a1')).rejects.toBeInstanceOf(NotFoundException);
      expect(address.updateMany).not.toHaveBeenCalled();
    });

    it('remove địa chỉ mặc định → địa chỉ mới nhất còn lại thành mặc định', async () => {
      address.findFirst
        .mockResolvedValueOnce({ id: 'a1', isDefault: true }) // địa chỉ bị xóa
        .mockResolvedValueOnce({ id: 'a2' }); // mới nhất còn lại
      await expect(service.remove('u1', 'a1')).resolves.toEqual({ id: 'a1' });
      expect(address.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
      expect(address.update).toHaveBeenCalledWith({ where: { id: 'a2' }, data: { isDefault: true } });
    });

    it('remove địa chỉ không mặc định / địa chỉ cuối cùng → không đổi mặc định', async () => {
      address.findFirst.mockResolvedValueOnce({ id: 'a1', isDefault: false });
      await service.remove('u1', 'a1');
      address.findFirst.mockResolvedValueOnce({ id: 'a2', isDefault: true }).mockResolvedValueOnce(null);
      await service.remove('u1', 'a2');
      expect(address.update).not.toHaveBeenCalled();
    });
  });
});
