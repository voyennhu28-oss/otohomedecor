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

const SOFT_DELETE_MODEL_SET = new Set(SOFT_DELETE_MODELS);

/** Các lệnh ĐỌC được tự thêm điều kiện "chưa xóa". Lệnh ghi (update / delete...) giữ nguyên. */
const READ_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

const withNotDeleted = (where: any = {}) => {
  const and = where.AND ? [].concat(where.AND) : [];
  return { ...where, AND: [...and, NOT_DELETED] };
};

const extend = (client: PrismaClient) =>
  client.$extends({
    query: {
      $allModels: {
        $allOperations: ({ model, operation, args, query }) =>
          SOFT_DELETE_MODEL_SET.has(model) && READ_OPERATIONS.has(operation)
            ? query({ ...args, where: withNotDeleted((args as any).where) })
            : query(args),
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
