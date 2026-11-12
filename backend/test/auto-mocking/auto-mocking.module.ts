import { Module, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { ModuleMocker, MockMetadata } from 'jest-mock';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
const moduleMocker = new ModuleMocker(global);

@Module({})
export class AutoMockingModule {
  static async createTestingModule(metadata: ModuleMetadata) {
    return await Test.createTestingModule(metadata)
      .useMocker((token) => {
        if (typeof token === 'function') {
          if (token.name === PrismaService.name) {
            return new (token as any)();
          }

          const mockMetadata = moduleMocker.getMetadata(token) as MockMetadata<
            any,
            any
          >;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
        if (token === CACHE_MANAGER) {
          return {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
          } as unknown as Cache;
        }
      })
      .compile();
  }
}
