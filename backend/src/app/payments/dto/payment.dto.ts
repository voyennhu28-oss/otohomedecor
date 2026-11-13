import { PaymentStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { itemPerPageQuery, pageQuery, searchQuery } from '../../../common/dto/query.dto';

/**
 * Body webhook SePay (developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook).
 * `.passthrough()`: SePay thêm field mới cũng không làm webhook lỗi. Field có thể rỗng / null.
 */
export class SepayWebhookDto extends createZodDto(
  z
    .object({
      id: z.number().int(), // id giao dịch của SePay, không đổi khi gửi lại → khóa chống trùng
      gateway: z.string().nullish(), // tên ngân hàng
      transactionDate: z.string().nullish(), // "YYYY-MM-DD HH:mm:ss" giờ VN
      accountNumber: z.string().nullish(),
      subAccount: z.string().nullish(),
      code: z.string().nullish(), // mã thanh toán SePay nhận diện được, null nếu không khớp cấu hình
      content: z.string().nullish(), // nội dung chuyển khoản gốc
      transferType: z.enum(['in', 'out']),
      transferAmount: z.number().int().min(0),
      accumulated: z.number().nullish(),
      referenceCode: z.string().nullish(),
      description: z.string().nullish(),
    })
    .passthrough(),
) {}

/** GET /admin/payments: đối soát giao dịch, vd ?status=failed để xem tiền vào cần xử lý. */
export class PaymentListQueryDto extends createZodDto(
  z.object({
    status: z.nativeEnum(PaymentStatus).optional(),
    orderNumber: searchQuery.optional(),
    page: pageQuery,
    itemPerPage: itemPerPageQuery(100, 20),
  }),
) {}
