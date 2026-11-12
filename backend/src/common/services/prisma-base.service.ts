import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ExtendedClient = PrismaService['extended'];

export type ModelKey = Uncapitalize<Prisma.ModelName>;

export class PrismaBaseService<K extends ModelKey> {
  constructor(
    protected prismaService: PrismaService,
    private readonly model: K,
  ) {}

  protected get extended(): ExtendedClient[K] {
    return this.prismaService.extended[this.model];
  }

  protected get client(): PrismaClient[K] {
    return this.prismaService[this.model];
  }
}
