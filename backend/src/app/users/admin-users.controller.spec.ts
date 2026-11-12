import { BadRequestException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { AutoMockingModule } from '../../../test/auto-mocking/auto-mocking.module';
import { IS_ADMIN_ONLY } from '../../common/decorators/admin-only.decorator';
import { IS_PUBLIC } from '../../common/decorators/public.decorator';
import type { UserInfo } from '../../common/decorators/user.decorator';
import { AdminUsersController } from './admin-users.controller';
import { UsersService } from './users.service';

const admin: UserInfo = {
  userID: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  userEmail: 'admin@x.com',
  role: Role.admin,
};
const OTHER_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

describe('AdminUsersController (/admin/users)', () => {
  let controller: AdminUsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module = await AutoMockingModule.createTestingModule({
      controllers: [AdminUsersController],
    });
    controller = module.get(AdminUsersController);
    usersService = module.get(UsersService);
  });

  it('@AdminOnly() gắn ở cấp class, không route nào @Public', () => {
    expect(Reflect.getMetadata(IS_ADMIN_ONLY, AdminUsersController)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC, AdminUsersController)).toBeUndefined();
    for (const method of Object.getOwnPropertyNames(AdminUsersController.prototype)) {
      const handler = (AdminUsersController.prototype as any)[method];
      expect(Reflect.getMetadata(IS_PUBLIC, handler)).toBeUndefined();
    }
  });

  it('findAll: chuyển nguyên query (đã validate) cho service', async () => {
    const query = { page: 2, itemPerPage: 5, q: 'an', role: Role.customer };
    const page = { list: [], totalItems: 0, totalPages: 0 };
    usersService.findAll.mockResolvedValue(page);
    await expect(controller.findAll(query)).resolves.toBe(page);
    expect(usersService.findAll).toHaveBeenCalledWith(query);
  });

  it('findOne: lấy id từ param', async () => {
    usersService.findOne.mockResolvedValue({ id: OTHER_ID, totalSpent: 0 } as any);
    await controller.findOne({ id: OTHER_ID });
    expect(usersService.findOne).toHaveBeenCalledWith(OTHER_ID);
  });

  it('create', async () => {
    const dto = {
      email: 'new@x.com',
      password: '12345678',
      fullName: 'New',
      role: Role.customer,
      status: UserStatus.active,
    };
    usersService.create.mockResolvedValue({ id: OTHER_ID } as any);
    await controller.create(dto);
    expect(usersService.create).toHaveBeenCalledWith(dto);
  });

  describe('update', () => {
    it('truyền admin hiện tại để service chặn tự hạ quyền', async () => {
      const dto = { status: UserStatus.inactive };
      usersService.update.mockResolvedValue({ id: OTHER_ID } as any);
      await controller.update(admin, { id: OTHER_ID }, dto);
      expect(usersService.update).toHaveBeenCalledWith(admin, OTHER_ID, dto);
    });

    it('chuyển tiếp lỗi khi admin tự khóa mình', async () => {
      usersService.update.mockRejectedValue(new BadRequestException());
      await expect(
        controller.update(admin, { id: admin.userID }, { status: UserStatus.inactive }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('remove: truyền admin hiện tại và id', async () => {
    usersService.remove.mockResolvedValue({ id: OTHER_ID });
    await expect(controller.remove(admin, { id: OTHER_ID })).resolves.toEqual({ id: OTHER_ID });
    expect(usersService.remove).toHaveBeenCalledWith(admin, OTHER_ID);
  });
});
