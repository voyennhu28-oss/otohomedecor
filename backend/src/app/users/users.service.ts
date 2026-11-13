import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserInfo } from '../../common/decorators/user.decorator';
import { NOT_DELETED, PrismaService } from '../../common/prisma/prisma.service';
import { withRetry } from '../../common/prisma/with-retry';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import { ProductsService } from '../products/products.service';
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
  tokenVersion: true,
} satisfies Prisma.UserOmit;

/** Tăng tokenVersion → mọi refresh token đã phát mất hiệu lực (field thiếu = 0). */
const nextTokenVersion = (current?: number | null) => (current ?? 0) + 1;

@Injectable()
export class UsersService extends PrismaBaseService<'user'> {
  constructor(
    prismaService: PrismaService,
    private readonly productsService: ProductsService,
  ) {
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

    const products = await this.productsService.findCardsByIDs(ids);

    // Sản phẩm thêm sau hiện trước. Sản phẩm đã ẩn / xóa thì không hiện (vẫn giữ ID trong mảng)
    const byID = new Map(products.map((p) => [p.id, p]));
    return [...ids]
      .reverse()
      .map((id) => byID.get(id))
      .filter((p) => p !== undefined);
  }

  async addToWishlist(userID: string, productID: string) {
    await this.ensureExists(userID);
    await this.productsService.ensureActive(productID);

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
    // Prisma + MongoDB không có `pull` cho mảng scalar, nên phải đọc rồi ghi lại cả mảng.
    // Chạy trong transaction: nếu request khác (vd thêm sản phẩm) ghi chen vào giữa thì
    // transaction bị xung đột (P2034) và chạy lại với dữ liệu mới, không ghi đè mất.
    const wishlistProductIDs = await withRetry(() =>
      this.prismaService.$transaction(async (tx) => {
        const user = await tx.user.findFirst({
          where: { id: userID, ...NOT_DELETED },
          select: { wishlistProductIDs: true },
        });
        if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

        const next = user.wishlistProductIDs.filter((id) => id !== productID);
        if (next.length !== user.wishlistProductIDs.length) {
          await tx.user.update({
            where: { id: userID },
            data: { wishlistProductIDs: { set: next } },
          });
        }
        return next;
      }),
    );
    return { wishlistProductIDs };
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

    const current = await this.ensureExists(id);
    // Khóa tài khoản: thu hồi luôn refresh token, để mở khóa sau này token cũ không dùng lại được
    const isLocking =
      dto.status === UserStatus.inactive && current.status !== UserStatus.inactive;
    return this.extended.update({
      where: { id },
      data: isLocking
        ? { ...dto, tokenVersion: nextTokenVersion(current.tokenVersion) }
        : dto,
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
      select: { id: true, tokenVersion: true },
    });
  }

  /**
   * Hash mật khẩu mới, vô hiệu hóa token reset (nếu có) và mọi refresh token đã phát.
   * Trả về tokenVersion mới để auth cấp token mới cho phiên hiện tại.
   */
  async updatePassword(
    user: { id: string; tokenVersion?: number | null },
    plainPassword: string,
  ) {
    const tokenVersion = nextTokenVersion(user.tokenVersion);
    await this.extended.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(plainPassword, SALT_ROUNDS),
        resetPasswordToken: null,
        resetPasswordExp: null,
        tokenVersion,
      },
    });
    return tokenVersion;
  }

  // ───────────── helpers ─────────────

  /** Ném 404 nếu user không tồn tại hoặc đã bị soft delete. */
  private async ensureExists(id: string) {
    const user = await this.extended.findUnique({
      where: { id },
      select: { id: true, status: true, tokenVersion: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
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
