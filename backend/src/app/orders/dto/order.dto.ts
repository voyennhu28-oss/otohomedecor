import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  itemPerPageQuery,
  pageQuery,
  searchQuery,
  vnDateQuery as vnDay,
} from '../../../common/dto/query.dto';
import { ORDER_NUMBER_REGEX } from '../order-number';

const note = z.string().trim().min(1).max(500);

export class OrderNumberParamDto extends createZodDto(
  z.object({
    orderNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(ORDER_NUMBER_REGEX, 'Mã đơn không hợp lệ'),
  }),
) {}

export class MyOrderListQueryDto extends createZodDto(
  z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    page: pageQuery,
    itemPerPage: itemPerPageQuery(50, 10),
  }),
) {}

export class CancelOrderDto extends createZodDto(
  z.object({ reason: note.optional() }).strict().default({}),
) {}

const adminOrderFilter = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  from: vnDay('start').optional(),
  to: vnDay('end').optional(),
  orderNumber: searchQuery.optional(),
  email: searchQuery.optional(),
});

const fromBeforeTo = (f: { from?: Date; to?: Date }) =>
  !f.from || !f.to || f.from <= f.to;
const FROM_TO_ERROR = { message: '"from" phải trước "to"', path: ['from'] };

export type AdminOrderFilter = z.infer<typeof adminOrderFilter>;

export class AdminOrderListQueryDto extends createZodDto(
  adminOrderFilter
    .extend({ page: pageQuery, itemPerPage: itemPerPageQuery(100, 20) })
    .refine(fromBeforeTo, FROM_TO_ERROR),
) {}

export class ExportOrdersDto extends createZodDto(
  adminOrderFilter.strict().default({}).refine(fromBeforeTo, FROM_TO_ERROR),
) {}

export class MarkPaidDto extends createZodDto(
  z.object({ note: note.optional() }).strict().default({}),
) {}

export class UpdateOrderStatusDto extends createZodDto(
  z
    .object({ status: z.nativeEnum(OrderStatus), note: note.optional() })
    .strict(),
) {}
