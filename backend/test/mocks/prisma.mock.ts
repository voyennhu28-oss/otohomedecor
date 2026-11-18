import { PrismaService } from '../../src/common/prisma/prisma.service';

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
  softDelete: jest.fn(),
  restore: jest.fn(),
  export: jest.fn(),
});

export type PrismaModelMock = ReturnType<typeof createPrismaModelMock>;

export const createPrismaServiceMock = (model: string) => {
  const modelMock = createPrismaModelMock();
  const prismaService = {
    [model]: modelMock,
    extended: { [model]: modelMock },
  } as unknown as PrismaService;
  return { prismaService, modelMock };
};
