/**
 * Giá trị cho các field lọc của Product (plan mục 3.2).
 * Dùng trong Zod (z.enum) để dữ liệu nhập vào luôn đồng nhất.
 */

export const ROOMS = [
  'living-room',
  'bedroom',
  'dining-room',
  'kitchen',
  'office',
  'bathroom',
  'outdoor',
  'kids',
] as const;

export const STYLES = [
  'scandinavian',
  'japandi',
  'indochine',
  'minimalist',
  'industrial',
  'vintage',
  'modern',
  'boho',
] as const;

export const MATERIALS = [
  'oak',
  'walnut',
  'ash',
  'rattan',
  'bamboo',
  'ceramic',
  'metal',
  'glass',
  'fabric',
  'leather',
  'marble',
  'linen',
] as const;

/**
 * Tên option của variant được coi là "màu" (so sánh sau khi bỏ dấu, viết thường).
 * Vd variant có option { name: 'Màu', value: 'Xám' } → product.colors chứa 'Xám'.
 */
export const COLOR_OPTION_NAMES = ['mau', 'mau-sac', 'color'];

export type Room = (typeof ROOMS)[number];
export type Style = (typeof STYLES)[number];
export type Material = (typeof MATERIALS)[number];
