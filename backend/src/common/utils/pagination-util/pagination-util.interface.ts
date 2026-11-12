import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export enum PagingDefault {
  ITEM_PER_PAGE = 10,
  PAGE = 1,
}
export class Pagination extends createZodDto(
  z
    .object({
      itemPerPage: z.number().default(PagingDefault.ITEM_PER_PAGE),
      page: z.number().default(PagingDefault.PAGE),
      select: z.string().optional(),
    })
    .passthrough(),
) {}
