import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
export const SOFT_DELETE_MODELS: string[] = [
  'User',
  'Category',
  'Product',
  'ProductVariant',
  'Promotion',
];

export const NOT_DELETED = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

const withNotDeleted = (model: string, where: any = {}) => {
  if (!SOFT_DELETE_MODELS.includes(model)) return where;
  const and = where.AND ? [].concat(where.AND) : [];
  return { ...where, AND: [...and, NOT_DELETED] };
};

const extend = (client: PrismaClient) =>
  client.$extends({
    query: {
      $allModels: {
        findUnique: ({ model, args, query }) =>
          query({ ...args, where: withNotDeleted(model, args.where) }),
        findUniqueOrThrow: ({ model, args, query }) =>
          query({ ...args, where: withNotDeleted(model, args.where) }),
        findFirst: ({ model, args, query }) =>
          query({ ...args, where: withNotDeleted(model, args.where) }),
        findFirstOrThrow: ({ model, args, query }) =>
          query({ ...args, where: withNotDeleted(model, args.where) }),
        findMany: ({ model, args, query }) =>
          query({ ...args, where: withNotDeleted(model, args.where) }),
        count: ({ model, args, query }) =>
          query({ ...args, where: withNotDeleted(model, args.where) }),
      },
    },
    model: {
      $allModels: {
        async softDelete<T>(
          this: T,
          where: Prisma.Args<T, 'updateMany'>['where'],
        ) {
          const ctx: any = Prisma.getExtensionContext(this);
          return ctx.updateMany({ where, data: { deletedAt: new Date() } });
        },
        async restore<T>(
          this: T,
          where: Prisma.Args<T, 'updateMany'>['where'],
        ) {
          const ctx: any = Prisma.getExtensionContext(this);
          return ctx.updateMany({ where, data: { deletedAt: null } });
        },
      },
    },
  });

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  readonly extended = extend(this); // service dùng this.prisma.extended.product.findMany(...)

  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
