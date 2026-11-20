import type { VariantOption } from '@/features/products/types';

export type SaleStatus =
  | 'available'
  | 'made_to_order'
  | 'insufficient_stock'
  | 'out_of_stock'
  | 'unavailable';

export type CartLine = {
  variantID: string;
  quantity: number;
  addedAt: string;
  status: SaleStatus;
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  } | null;
  variant: {
    name: string;
    sku: string;
    options: VariantOption[];
    price: number;
    compareAtPrice: number | null;
    stock: number;
    leadTimeDays?: number;
  } | null;
  lineTotal: number;
};

export type Cart = {
  items: CartLine[];
  totalQuantity: number;
  subtotal: number;
  canCheckout: boolean;
};

export type AddCartItemInput = { variantID: string; quantity?: number };
