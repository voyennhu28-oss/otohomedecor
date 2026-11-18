import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectId } from '../../../common/dto/param.dto';

export class ExportProductsDto extends createZodDto(
  z.object({ ids: z.array(objectId).max(1000).optional() }).default({}),
) {}
