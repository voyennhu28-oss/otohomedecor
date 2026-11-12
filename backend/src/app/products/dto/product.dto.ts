import { ProductStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MATERIALS, ROOMS, STYLES } from '../../../common/constants/catalog.const';
import { objectId, slugSchema } from '../../../common/dto/param.dto';
import { variantInputSchema } from './variant-input.schema';

/** Mảng không trùng phần tử (gửi ["oak","oak"] → lưu ["oak"]). */
const uniqueArray = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z
    .array(item)
    .max(max)
    .transform((values) => [...new Set(values)] as z.infer<T>[]);

const money = z.number().int().min(0);

/** Các field của product mà admin được nhập (không gồm field tính tự động: minPrice, ratingAvg...). */
const productFields = {
  name: z.string().trim().min(1).max(200),
  slug: slugSchema,
  shortDescription: z.string().trim().max(500),
  description: z.string().max(20_000), // HTML / markdown
  categoryID: objectId,
  rooms: uniqueArray(z.enum(ROOMS), ROOMS.length),
  styles: uniqueArray(z.enum(STYLES), STYLES.length),
  materials: uniqueArray(z.enum(MATERIALS), MATERIALS.length),
  tags: uniqueArray(z.string().trim().min(1).max(30), 20),
  requiresAssembly: z.boolean(),
  assemblyFee: money, // VND / sản phẩm
  allowBackorder: z.boolean(), // hàng đặt làm: cho đặt khi hết kho
  leadTimeDays: z.number().int().min(0).max(365),
  warrantyMonths: z.number().int().min(0).max(120),
  isFeatured: z.boolean(),
  status: z.nativeEnum(ProductStatus),
};

/**
 * POST /admin/products: tạo product kèm ÍT NHẤT 1 variant.
 * Không gửi slug thì tự sinh từ name.
 */
export class CreateProductDto extends createZodDto(
  z
    .object({
      name: productFields.name,
      slug: productFields.slug.optional(),
      shortDescription: productFields.shortDescription.optional(),
      description: productFields.description.optional(),
      categoryID: productFields.categoryID,
      rooms: productFields.rooms.default([]),
      styles: productFields.styles.default([]),
      materials: productFields.materials.default([]),
      tags: productFields.tags.default([]),
      requiresAssembly: productFields.requiresAssembly.optional(),
      assemblyFee: productFields.assemblyFee.optional(),
      allowBackorder: productFields.allowBackorder.optional(),
      leadTimeDays: productFields.leadTimeDays.optional(),
      warrantyMonths: productFields.warrantyMonths.optional(),
      isFeatured: productFields.isFeatured.optional(),
      status: productFields.status.optional(), // mặc định draft
      variants: z
        .array(variantInputSchema)
        .min(1, 'Sản phẩm phải có ít nhất 1 variant')
        .max(50),
    })
    .strict()
    .superRefine(({ variants }, ctx) => {
      // SKU không được trùng nhau ngay trong cùng request
      const seen = new Set<string>();
      variants.forEach(({ sku }, index) => {
        if (seen.has(sku)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `SKU "${sku}" bị trùng`,
            path: ['variants', index, 'sku'],
          });
        }
        seen.add(sku);
      });
    }),
) {}

/**
 * PATCH /admin/products/:id: chỉ sửa thông tin product.
 * Variant sửa qua /admin/products/:id/variants. Đổi name KHÔNG tự đổi slug.
 */
export class UpdateProductDto extends createZodDto(
  z
    .object({
      name: productFields.name.optional(),
      slug: productFields.slug.optional(),
      shortDescription: productFields.shortDescription.nullable().optional(),
      description: productFields.description.nullable().optional(),
      categoryID: productFields.categoryID.optional(),
      rooms: productFields.rooms.optional(),
      styles: productFields.styles.optional(),
      materials: productFields.materials.optional(),
      tags: productFields.tags.optional(),
      requiresAssembly: productFields.requiresAssembly.optional(),
      assemblyFee: productFields.assemblyFee.optional(),
      allowBackorder: productFields.allowBackorder.optional(),
      leadTimeDays: productFields.leadTimeDays.optional(),
      warrantyMonths: productFields.warrantyMonths.optional(),
      isFeatured: productFields.isFeatured.optional(),
      status: productFields.status.optional(),
    })
    .strict(),
) {}
