import { PrismaService } from '../../src/common/prisma/prisma.service';

/**
 * Mock 1 model của Prisma (vd: prisma.extended.user).
 * Mỗi method là jest.fn() → trong test chỉ cần:
 *   model.findUnique.mockResolvedValue(...)
 * và sau đó kiểm tra: expect(model.findUnique).toHaveBeenCalledWith(...)
 */
export const createPrismaModelMock = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  createManyAndReturn: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  // các method custom thêm bằng Client Extensions trong PrismaService
  softDelete: jest.fn(),
  restore: jest.fn(),
  export: jest.fn(),
});

export type PrismaModelMock = ReturnType<typeof createPrismaModelMock>;

/**
 * Mock PrismaService cho 1 model.
 * PrismaBaseService đọc `prismaService[model]` (client) và
 * `prismaService.extended[model]` (extended) → mock cả hai,
 * dùng chung 1 object để test không phải quan tâm service gọi cái nào.
 */
export const createPrismaServiceMock = (model: string) => {
  const modelMock = createPrismaModelMock();
  const prismaService = {
    [model]: modelMock,
    extended: { [model]: modelMock },
  } as unknown as PrismaService;
  return { prismaService, modelMock };
};
