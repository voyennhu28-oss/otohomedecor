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
  z.object({ orderNumber: z.string().trim().toUpperCase().regex(ORDER_NUMBER_REGEX, 'Mã đơn không hợp lệ') }),
) {}

/** GET /me/orders?status=&page=&itemPerPage= */
export class MyOrderListQueryDto extends createZodDto(
  z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    page: pageQuery,
    itemPerPage: itemPerPageQuery(50, 10),
  }),
) {}

/** POST /me/orders/:orderNumber/cancel */
export class CancelOrderDto extends createZodDto(
  // .default({}): Express 5 để req.body = undefined khi không gửi body
  z.object({ reason: note.optional() }).strict().default({}),
) {}

/** Bộ lọc đơn của admin, dùng chung cho danh sách và export Excel. */
const adminOrderFilter = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  from: vnDay('start').optional(), // ngày đặt từ
  to: vnDay('end').optional(), // ngày đặt đến (gồm cả ngày đó)
  orderNumber: searchQuery.optional(), // tìm 1 phần mã đơn
  email: searchQuery.optional(), // tìm 1 phần email khách
});

const fromBeforeTo = (f: { from?: Date; to?: Date }) => !f.from || !f.to || f.from <= f.to;
const FROM_TO_ERROR = { message: '"from" phải trước "to"', path: ['from'] };

export type AdminOrderFilter = z.infer<typeof adminOrderFilter>;

/** GET /admin/orders */
export class AdminOrderListQueryDto extends createZodDto(
  adminOrderFilter
    .extend({ page: pageQuery, itemPerPage: itemPerPageQuery(100, 20) })
    .refine(fromBeforeTo, FROM_TO_ERROR),
) {}

/** POST /admin/orders/export: cùng bộ lọc với danh sách (body), không phân trang. */
export class ExportOrdersDto extends createZodDto(
  adminOrderFilter.strict().default({}).refine(fromBeforeTo, FROM_TO_ERROR),
) {}

/** POST /admin/orders/:id/mark-paid: admin xác nhận đã nhận tiền (SePay không tự khớp được). */
export class MarkPaidDto extends createZodDto(
  z.object({ note: note.optional() }).strict().default({}),
) {}

/** PATCH /admin/orders/:id/status. `note` lưu vào lịch sử; hủy đơn thì là lý do hủy. */
export class UpdateOrderStatusDto extends createZodDto(
  z.object({ status: z.nativeEnum(OrderStatus), note: note.optional() }).strict(),
) {}
