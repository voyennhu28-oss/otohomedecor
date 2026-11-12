import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectId } from '../../../common/dto/param.dto';

/** POST /admin/products/export. Không gửi body / ids rỗng = xuất tất cả. */
export class ExportProductsDto extends createZodDto(
  // .default({}): Express 5 để req.body = undefined khi request không có body
  z.object({ ids: z.array(objectId).max(1000).optional() }).default({}),
) {}
