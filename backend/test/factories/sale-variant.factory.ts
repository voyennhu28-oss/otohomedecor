import { ProductStatus } from '@prisma/client';
import type { SaleVariant } from '../../src/app/product-variants/product-variants.service';

type ProductOverrides = Partial<SaleVariant['product']>;

/** Variant đang bán, đủ hàng. Ghi đè field cần thiết cho từng test. */
export const makeSaleVariant = (
  overrides: Partial<Omit<SaleVariant, 'product'>> = {},
  product: ProductOverrides = {},
): SaleVariant => ({
  id: 'v1',
  productID: 'p1',
  sku: 'SOFA-1',
  name: 'Sofa 3 chỗ - Xám',
  options: [],
  price: 10_000_000,
  compareAtPrice: null,
  stock: 10,
  weightKg: 2,
  dimensions: null,
  images: [],
  isActive: true,
  ...overrides,
  product: {
    id: 'p1',
    name: 'Sofa Japandi',
    slug: 'sofa-japandi',
    images: [{ url: 'https://cdn/p1.jpg', publicID: null, alt: null, sortOrder: 0 }],
    status: ProductStatus.active,
    allowBackorder: false,
    requiresAssembly: false,
    assemblyFee: 0,
    leadTimeDays: 0,
    ...product,
  },
});
