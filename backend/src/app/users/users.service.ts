import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserInfo } from '../../common/decorators/user.decorator';
import { NOT_DELETED, PrismaService } from '../../common/prisma/prisma.service';
import { withRetry } from '../../common/prisma/with-retry';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export const SALT_ROUNDS = 10;

const SENSITIVE_FIELDS = {
  password: true,
  resetPasswordToken: true,
  resetPasswordExp: true,
  tokenVersion: true,
} satisfies Prisma.UserOmit;

export const omitSensitive = <
  T extends Record<keyof typeof SENSITIVE_FIELDS, unknown>,
>({
  password: _password,
  resetPasswordToken: _resetPasswordToken,
  resetPasswordExp: _resetPasswordExp,
  tokenVersion: _tokenVersion,
  ...rest
}: T): Omit<T, keyof typeof SENSITIVE_FIELDS> => rest;

const nextTokenVersion = (current?: number | null) => (current ?? 0) + 1;

const userNotFound = () => new NotFoundException('Không tìm thấy tài khoản');

const rethrowNotFound = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    throw userNotFound();
  }
  throw error;
};

@Injectable()
export class UsersService extends PrismaBaseService<'user'> {
  constructor(
    prismaService: PrismaService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
  ) {
    super(prismaService, 'user');
  }

  async getMe(userID: string) {
    const user = await this.extended.findUnique({
      where: { id: userID },
      omit: SENSITIVE_FIELDS,
    });
    if (!user) throw userNotFound();
    return user;
  }

  updateMe(userID: string, dto: UpdateMeDto) {
    return this.extended
      .update({
        where: { id: userID, ...NOT_DELETED },
        data: dto,
        omit: SENSITIVE_FIELDS,
      })
      .catch(rethrowNotFound);
  }

  async getWishlist(userID: string) {
    const ids = await this.getWishlistIDs(userID);
    if (!ids.length) return [];

    const products = await this.productsService.findCardsByIDs(ids);

    const byID = new Map(products.map((p) => [p.id, p]));
    return [...ids]
      .reverse()
      .map((id) => byID.get(id))
      .filter((p) => p !== undefined);
  }

  async addToWishlist(userID: string, productID: string) {
    await this.productsService.ensureActive(productID);

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
    const wishlistProductIDs = await withRetry(() =>
      this.prismaService.$transaction(async (tx) => {
        const user = await tx.user.findFirst({
          where: { id: userID, ...NOT_DELETED },
          select: { wishlistProductIDs: true },
        });
        if (!user) throw userNotFound();

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
      this.extended.count({ where }),
    ]);

    return {
      list,
      totalItems,
      totalPages: Math.ceil(totalItems / itemPerPage),
    };
  }

  async findOne(id: string) {
    const [user, totalSpent] = await Promise.all([
      this.extended.findUnique({
        where: { id },
        omit: SENSITIVE_FIELDS,
        include: {
          addresses: { orderBy: { isDefault: 'desc' } },
          _count: { select: { orders: true, reviews: true } },
        },
      }),
      this.ordersService.totalSpent(id),
    ]);
    if (!user) throw userNotFound();

    return { ...user, totalSpent };
  }

  async create(dto: CreateUserDto) {
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
    const isLocking =
      dto.status === UserStatus.inactive &&
      current.status !== UserStatus.inactive;
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
    const { count } = await this.extended.softDelete({ id, ...NOT_DELETED });
    if (!count) throw userNotFound();
    return { id };
  }

  findForAuth(where: { id: string } | { email: string }) {
    return this.extended.findUnique({ where });
  }

  async setResetPasswordToken(id: string, tokenHash: string, expiresAt: Date) {
    await this.extended.update({
      where: { id },
      data: { resetPasswordToken: tokenHash, resetPasswordExp: expiresAt },
    });
  }

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

  private async ensureExists(id: string) {
    const user = await this.extended.findUnique({
      where: { id },
      select: { id: true, status: true, tokenVersion: true },
    });
    if (!user) throw userNotFound();
    return user;
  }

  private async getWishlistIDs(userID: string) {
    const user = await this.extended.findUnique({
      where: { id: userID },
      select: { wishlistProductIDs: true },
    });
    if (!user) throw userNotFound();
    return user.wishlistProductIDs;
  }
}
