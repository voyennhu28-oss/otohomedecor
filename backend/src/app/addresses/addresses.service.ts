import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Address, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { withRetry } from '../../common/prisma/with-retry';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

export const MAX_ADDRESSES_PER_USER = 20;

const ADDRESS_ORDER: Prisma.AddressOrderByWithRelationInput[] = [
  { isDefault: 'desc' },
  { createdAt: 'desc' },
];

@Injectable()
export class AddressesService extends PrismaBaseService<'address'> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'address');
  }

  findMine(userID: string) {
    return this.extended.findMany({
      where: { userID },
      orderBy: ADDRESS_ORDER,
    });
  }

  create(userID: string, dto: CreateAddressDto) {
    const { isDefault, ...data } = dto;
    return this.inTransaction(async (tx) => {
      const count = await tx.address.count({ where: { userID } });
      if (count >= MAX_ADDRESSES_PER_USER) {
        throw new BadRequestException(
          `Tối đa ${MAX_ADDRESSES_PER_USER} địa chỉ`,
        );
      }
      const makeDefault = isDefault || count === 0;
      if (makeDefault) await this.unsetDefault(tx, userID);
      return tx.address.create({
        data: { ...data, userID, isDefault: makeDefault },
      });
    });
  }

  async update(userID: string, id: string, dto: UpdateAddressDto) {
    await this.findOwnedOrThrow(userID, id);
    return this.extended.update({ where: { id }, data: dto });
  }

  setDefault(userID: string, id: string) {
    return this.inTransaction(async (tx) => {
      await this.findOwnedOrThrow(userID, id, tx);
      await this.unsetDefault(tx, userID, id);
      return tx.address.update({ where: { id }, data: { isDefault: true } });
    });
  }

  remove(userID: string, id: string) {
    return this.inTransaction(async (tx) => {
      const address = await this.findOwnedOrThrow(userID, id, tx);
      await tx.address.delete({ where: { id } });

      if (address.isDefault) {
        const next = await tx.address.findFirst({
          where: { userID },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (next)
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
      }
      return { id };
    });
  }

  findOwned(
    userID: string,
    id: string,
    db: Prisma.TransactionClient = this.prismaService,
  ) {
    return db.address.findFirst({ where: { id, userID } });
  }

  private async findOwnedOrThrow(
    userID: string,
    id: string,
    db: Prisma.TransactionClient = this.prismaService,
  ): Promise<Address> {
    const address = await this.findOwned(userID, id, db);
    if (!address) throw new NotFoundException('Không tìm thấy địa chỉ');
    return address;
  }

  private unsetDefault(
    tx: Prisma.TransactionClient,
    userID: string,
    exceptID?: string,
  ) {
    return tx.address.updateMany({
      where: {
        userID,
        isDefault: true,
        ...(exceptID && { id: { not: exceptID } }),
      },
      data: { isDefault: false },
    });
  }

  private inTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return withRetry(() => this.prismaService.$transaction(fn));
  }
}
