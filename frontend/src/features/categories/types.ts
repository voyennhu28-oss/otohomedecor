export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentID: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type AdminCategoryNode = Category & {
  productCount: number;
  children: AdminCategoryNode[];
};

export type CreateCategoryInput = {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  parentID?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateCategoryInput = Partial<{
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentID: string | null;
  sortOrder: number;
  isActive: boolean;
}>;
