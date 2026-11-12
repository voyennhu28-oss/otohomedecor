import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  ProductStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserInfo } from '../../common/decorators/user.decorator';
import { NOT_DELETED, PrismaService } from '../../common/prisma/prisma.service';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export const SALT_ROUNDS = 10;

/** Không bao giờ trả các field này ra response. */
const SENSITIVE_FIELDS = {
  password: true,
  resetPasswordToken: true,
  resetPasswordExp: true,
} satisfies Prisma.UserOmit;

@Injectable()
export class UsersService extends PrismaBaseService<'user'> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'user');
  }

  // ───────────── /me ─────────────

  async getMe(userID: string) {
    const user = await this.extended.findUnique({
      where: { id: userID },
      omit: SENSITIVE_FIELDS,
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
  }

  async updateMe(userID: string, dto: UpdateMeDto) {
    await this.ensureExists(userID);
    return this.extended.update({
      where: { id: userID },
      data: dto,
      omit: SENSITIVE_FIELDS,
    });
  }

  // ───────────── /me/wishlist ─────────────

  async getWishlist(userID: string) {
    const ids = await this.getWishlistIDs(userID);
    if (!ids.length) return [];

    // TODO: chuyển sang ProductsService khi có module products
    const products = await this.prismaService.extended.product.findMany({
      where: { id: { in: ids }, status: ProductStatus.active },
      select: {
        id: true,
        name: true,
        slug: true,
        images: true,
        minPrice: true,
        maxPrice: true,
        ratingAvg: true,
        ratingCount: true,
      },
    });

    // Sản phẩm thêm sau hiện trước. Sản phẩm đã ẩn / xóa thì không hiện (vẫn giữ ID trong mảng)
    const byID = new Map(products.map((p) => [p.id, p]));
    return [...ids]
      .reverse()
      .map((id) => byID.get(id))
      .filter((p) => p !== undefined);
  }

  async addToWishlist(userID: string, productID: string) {
    await this.ensureExists(userID);

    // TODO: chuyển sang ProductsService khi có module products
    const product = await this.prismaService.extended.product.findFirst({
      where: { id: productID, status: ProductStatus.active },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    // Atomic: chỉ push khi chưa có, nên gọi 2 lần cũng không bị trùng
    await this.extended.updateMany({
      where: {
        id: userID,
        ...NOT_DELETED,
        NOT: { wishlistProductIDs: { has: productID } },
      },
      data: { wishlistProductIDs: { push: productID } },
    });
    return { wishlistProductIDs: await this.getWishlistIDs(userID) };
  }

  async removeFromWishlist(userID: string, productID: string) {
    // Prisma + MongoDB không có `pull` cho mảng scalar, nên đọc rồi ghi lại cả mảng
    const ids = await this.getWishlistIDs(userID);
    const next = ids.filter((id) => id !== productID);
    if (next.length !== ids.length) {
      await this.extended.update({
        where: { id: userID },
        data: { wishlistProductIDs: { set: next } },
      });
    }
    return { wishlistProductIDs: next };
  }

  async findAll({ page, itemPerPage, q, role, status }: QueryUsersDto) {
    const where: Prisma.UserWhereInput = {
      ...(role && { role }),
      ...(status && { status }),
      ...(q && {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      }),
    };

    const [list, totalItems] = await Promise.all([
      this.extended.findMany({
        where,
        omit: SENSITIVE_FIELDS,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * itemPerPage,
        take: itemPerPage,
      }),
      this.extended.count({ where }), // cùng where với findMany
    ]);

    return {
      list,
      totalItems,
      totalPages: Math.ceil(totalItems / itemPerPage),
    };
  }

  async findOne(id: string) {
    const user = await this.extended.findUnique({
      where: { id },
      omit: SENSITIVE_FIELDS,
      include: {
        addresses: { orderBy: { isDefault: 'desc' } },
        _count: { select: { orders: true, reviews: true } },
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    // Tổng chi tiêu chỉ tính đơn đã giao (tiền đã thực sự trả)
    // TODO: chuyển sang OrdersService khi có module orders
    const spent = await this.prismaService.order.aggregate({
      where: { userID: id, status: OrderStatus.delivered },
      _sum: { total: true },
    });

    return { ...user, totalSpent: spent._sum.total ?? 0 };
  }

  async create(dto: CreateUserDto) {
    // Dùng client gốc để thấy cả tài khoản đã soft delete (email vẫn bị giữ bởi @unique)
    const existing = await this.client.findUnique({
      where: { email: dto.email },
      select: { deletedAt: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? 'Email thuộc một tài khoản đã bị xóa'
          : 'Email đã được sử dụng',
      );
    }

    const password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    return this.extended.create({
      data: { ...dto, password },
      omit: SENSITIVE_FIELDS,
    });
  }

  async update(currentUser: UserInfo, id: string, dto: UpdateUserDto) {
    if (id === currentUser.userID) {
      if (dto.role && dto.role !== Role.admin) {
        throw new BadRequestException(
          'Không thể tự hạ quyền admin của chính mình',
        );
      }
      if (dto.status === UserStatus.inactive) {
        throw new BadRequestException(
          'Không thể tự khóa tài khoản của chính mình',
        );
      }
    }

    await this.ensureExists(id);
    return this.extended.update({
      where: { id },
      data: dto,
      omit: SENSITIVE_FIELDS,
    });
  }

  async remove(currentUser: UserInfo, id: string) {
    if (id === currentUser.userID) {
      throw new BadRequestException(
        'Không thể tự xóa tài khoản của chính mình',
      );
    }
    await this.ensureExists(id);
    await this.extended.softDelete({ id });
    return { id };
  }

  // ───────────── dùng cho auth ─────────────

  /** User KÈM password để auth so sánh. Không bao giờ trả kết quả này ra response. */
  findForAuth(where: { id: string } | { email: string }) {
    return this.extended.findUnique({ where });
  }

  async setResetPasswordToken(id: string, tokenHash: string, expiresAt: Date) {
    await this.extended.update({
      where: { id },
      data: { resetPasswordToken: tokenHash, resetPasswordExp: expiresAt },
    });
  }

  /** Tìm user có token reset còn hạn (token đã được hash). */
  findByResetPasswordToken(tokenHash: string) {
    return this.extended.findFirst({
      where: {
        resetPasswordToken: tokenHash,
        resetPasswordExp: { gt: new Date() },
        status: UserStatus.active,
      },
      select: { id: true },
    });
  }

  /** Hash mật khẩu mới và vô hiệu hóa token reset (nếu có). */
  async updatePassword(id: string, plainPassword: string) {
    await this.extended.update({
      where: { id },
      data: {
        password: await bcrypt.hash(plainPassword, SALT_ROUNDS),
        resetPasswordToken: null,
        resetPasswordExp: null,
      },
    });
  }

  // ───────────── helpers ─────────────

  /** Ném 404 nếu user không tồn tại hoặc đã bị soft delete. */
  private async ensureExists(id: string) {
    const user = await this.extended.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
  }

  private async getWishlistIDs(userID: string) {
    const user = await this.extended.findUnique({
      where: { id: userID },
      select: { wishlistProductIDs: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user.wishlistProductIDs;
  }
}
