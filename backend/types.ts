declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PrismaJson {
    type ProductVariantSnapshotType = {
      productName: string;
      variantName: string;
      sku: string;
      attributes: Record<string, any>;
    };
  }
}

// This file must be a module.
export {};
