import { PaymentStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  itemPerPageQuery,
  pageQuery,
  searchQuery,
} from '../../../common/dto/query.dto';

export class SepayWebhookDto extends createZodDto(
  z
    .object({
      id: z.number().int(),
      gateway: z.string().nullish(),
      transactionDate: z.string().nullish(),
      accountNumber: z.string().nullish(),
      subAccount: z.string().nullish(),
      code: z.string().nullish(),
      content: z.string().nullish(),
      transferType: z.enum(['in', 'out']),
      transferAmount: z.number().int().min(0),
      accumulated: z.number().nullish(),
      referenceCode: z.string().nullish(),
      description: z.string().nullish(),
    })
    .passthrough(),
) {}

export class PaymentListQueryDto extends createZodDto(
  z.object({
    status: z.nativeEnum(PaymentStatus).optional(),
    orderNumber: searchQuery.optional(),
    page: pageQuery,
    itemPerPage: itemPerPageQuery(100, 20),
  }),
) {}
