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

/** "Màu sắc" → "mau-sac", để so với COLOR_OPTION_NAMES. */
const normalize = (text: string) =>
  kebabCase(
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[đĐ]/g, 'd'),
  );

const isColorOption = (optionName: string) =>
  COLOR_OPTION_NAMES.includes(normalize(optionName));

/**
 * Các field lưu thừa trên Product để lọc / sắp xếp mà không phải join variant:
 *  - minPrice / maxPrice: giá thấp nhất / cao nhất của variant đang bán (0 nếu không có)
 *  - colors: các giá trị option "Màu" của variant đang bán, không trùng (không phân biệt hoa thường)
 *
 * Phải gọi lại mỗi khi tạo / sửa / xóa variant.
 */
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
