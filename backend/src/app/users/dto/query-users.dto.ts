import { Role, UserStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PagingDefault } from '../../../common/utils/pagination-util/pagination-util.interface';

/** GET /admin/users?page=&itemPerPage=&q=&role=&status= */
export class QueryUsersDto extends createZodDto(
  z.object({
    page: z.coerce.number().int().min(1).default(PagingDefault.PAGE),
    itemPerPage: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(PagingDefault.ITEM_PER_PAGE),
    q: z.string().trim().min(1).optional(), // tìm theo email, tên, SĐT
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(UserStatus).optional(),
  }),
) {}
