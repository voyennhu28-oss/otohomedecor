import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AutoMockingModule } from '../../../test/auto-mocking/auto-mocking.module';
import { IS_ADMIN_ONLY } from '../../common/decorators/admin-only.decorator';
import { IS_PUBLIC } from '../../common/decorators/public.decorator';
import type { UserInfo } from '../../common/decorators/user.decorator';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const me: UserInfo = {
  userID: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  userEmail: 'c@x.com',
  role: Role.customer,
};
const PRODUCT_ID = 'cccccccccccccccccccccccc';

describe('UsersController (/me)', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module = await AutoMockingModule.createTestingModule({
      controllers: [UsersController],
    });
    controller = module.get(UsersController);
    usersService = module.get(UsersService);
  });

  it('cần đăng nhập, không cần admin (không @Public, không @AdminOnly)', () => {
    expect(Reflect.getMetadata(IS_PUBLIC, UsersController)).toBeUndefined();
    expect(Reflect.getMetadata(IS_ADMIN_ONLY, UsersController)).toBeUndefined();
    for (const method of Object.getOwnPropertyNames(UsersController.prototype)) {
      const handler = (UsersController.prototype as any)[method];
      expect(Reflect.getMetadata(IS_PUBLIC, handler)).toBeUndefined();
    }
  });

  describe('getMe', () => {
    it('lấy theo userID trong token', async () => {
      const profile = { id: me.userID, email: me.userEmail };
      usersService.getMe.mockResolvedValue(profile as any);
      await expect(controller.getMe(me)).resolves.toBe(profile);
      expect(usersService.getMe).toHaveBeenCalledWith(me.userID);
    });

    it('chuyển tiếp lỗi 404 từ service', async () => {
      usersService.getMe.mockRejectedValue(new NotFoundException());
      await expect(controller.getMe(me)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('updateMe: sửa đúng user trong token', async () => {
    const dto = { fullName: 'Tên mới', phone: '0901234567' };
    usersService.updateMe.mockResolvedValue({ id: me.userID, ...dto } as any);
    await controller.updateMe(me, dto);
    expect(usersService.updateMe).toHaveBeenCalledWith(me.userID, dto);
  });

  describe('wishlist', () => {
    it('getWishlist', async () => {
      usersService.getWishlist.mockResolvedValue([]);
      await expect(controller.getWishlist(me)).resolves.toEqual([]);
      expect(usersService.getWishlist).toHaveBeenCalledWith(me.userID);
    });

    it('addToWishlist: userID từ token, productID từ param', async () => {
      const response = { wishlistProductIDs: [PRODUCT_ID] };
      usersService.addToWishlist.mockResolvedValue(response);
      await expect(
        controller.addToWishlist(me, { productID: PRODUCT_ID }),
      ).resolves.toBe(response);
      expect(usersService.addToWishlist).toHaveBeenCalledWith(me.userID, PRODUCT_ID);
    });

    it('removeFromWishlist', async () => {
      usersService.removeFromWishlist.mockResolvedValue({ wishlistProductIDs: [] });
      await controller.removeFromWishlist(me, { productID: PRODUCT_ID });
      expect(usersService.removeFromWishlist).toHaveBeenCalledWith(me.userID, PRODUCT_ID);
    });
  });
});
