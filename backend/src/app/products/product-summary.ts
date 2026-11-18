import { kebabCase } from 'es-toolkit/compat';
import { COLOR_OPTION_NAMES } from '../../common/constants/catalog.const';

interface VariantForSummary {
  price: number;
  isActive: boolean;
  deletedAt?: Date | null;
  options: { name: string; value: string }[];
}

export interface ProductSummary {
  minPrice: number;
  maxPrice: number;
  colors: string[];
}

const normalize = (text: string) =>
  kebabCase(text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd'));

const isColorOption = (optionName: string) =>
  COLOR_OPTION_NAMES.includes(normalize(optionName));

export const computeProductSummary = (
  variants: VariantForSummary[],
): ProductSummary => {
  const selling = variants.filter((v) => v.isActive && !v.deletedAt);
  if (!selling.length) return { minPrice: 0, maxPrice: 0, colors: [] };

  const prices = selling.map((v) => v.price);
  const colorsByKey = new Map<string, string>();
  for (const variant of selling) {
    for (const option of variant.options) {
      if (!isColorOption(option.name)) continue;
      const key = option.value.toLowerCase();
      if (!colorsByKey.has(key)) colorsByKey.set(key, option.value);
    }
  }

  return {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    colors: [...colorsByKey.values()],
  };
};
