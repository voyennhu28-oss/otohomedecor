import type { ImageItem } from '@/features/products/types';

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: ImageItem | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CollectionRef = { id: string; name: string; slug: string };

export type CreateCollectionInput = {
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  startsAt?: string;
  endsAt?: string;
};

export type UpdateCollectionInput = Partial<{
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
}>;
