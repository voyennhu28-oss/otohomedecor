import type { Material, ProductStatus, Room, Style } from '@/constants/catalog';

export type ImageItem = {
  url: string;
  publicID: string | null;
  alt: string | null;
  sortOrder: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  categoryID: string;
  collectionIDs: string[];
  images: ImageItem[];
  rooms: Room[];
  styles: Style[];
  materials: Material[];
  colors: string[];
  tags: string[];
  minPrice: number;
  maxPrice: number;
  requiresAssembly: boolean;
  assemblyFee: number;
  allowBackorder: boolean;
  leadTimeDays: number;
  warrantyMonths: number;
  isFeatured: boolean;
  status: ProductStatus;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type VariantOption = { name: string; value: string };

export type Dimensions = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type ProductVariant = {
  id: string;
  productID: string;
  sku: string;
  name: string;
  options: VariantOption[];
  price: number;
  compareAtPrice: number | null;
  stock: number;
  dimensions: Dimensions | null;
  weightKg: number;
  images: ImageItem[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CategoryRef = { id: string; name: string; slug: string };

export type AdminProductListItem = Product & {
  category: CategoryRef;
  _count: { variants: number };
};

export type AdminProductDetail = Product & {
  category: CategoryRef;
  collections: CategoryRef[];
  variants: ProductVariant[];
};

export type AdminProductQuery = {
  q?: string;
  status?: ProductStatus;
  categoryID?: string;
  collectionID?: string;
  isFeatured?: boolean;
  page?: number;
  itemPerPage?: number;
};

export type VariantInput = {
  sku: string;
  name: string;
  options?: VariantOption[];
  price: number;
  compareAtPrice?: number | null;
  stock?: number;
  dimensions?: Dimensions | null;
  weightKg?: number;
  isActive?: boolean;
};

export type UpdateVariantInput = Partial<Omit<VariantInput, 'stock'>>;

export type StockInput = { stock: number } | { adjust: number };

export type ProductFieldsInput = {
  name: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryID: string;
  collectionIDs?: string[];
  rooms?: Room[];
  styles?: Style[];
  materials?: Material[];
  tags?: string[];
  requiresAssembly?: boolean;
  assemblyFee?: number;
  allowBackorder?: boolean;
  leadTimeDays?: number;
  warrantyMonths?: number;
  isFeatured?: boolean;
  status?: ProductStatus;
};

export type CreateProductInput = ProductFieldsInput & {
  variants: VariantInput[];
};

export type UpdateProductInput = Partial<ProductFieldsInput>;

export type ProductImportResult = {
  totalRows: number;
  created: { name: string; slug: string }[];
  errors: { rows: number[]; product?: string; messages: string[] }[];
};
