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

/**
 * 34 tỉnh / thành phố từ 01/07/2025 (Nghị quyết 202/2025/QH15). Dùng chung cho validate
 * địa chỉ, vùng giao hàng và seed. Địa chỉ lưu đúng chuỗi trong danh sách này.
 */
export const PROVINCES = [
  // 6 thành phố trực thuộc trung ương
  'Hà Nội',
  'Hải Phòng',
  'Huế',
  'Đà Nẵng',
  'Hồ Chí Minh',
  'Cần Thơ',
  // 28 tỉnh
  'Lai Châu',
  'Điện Biên',
  'Sơn La',
  'Lạng Sơn',
  'Cao Bằng',
  'Tuyên Quang',
  'Lào Cai',
  'Thái Nguyên',
  'Phú Thọ',
  'Bắc Ninh',
  'Hưng Yên',
  'Ninh Bình',
  'Quảng Ninh',
  'Thanh Hóa',
  'Nghệ An',
  'Hà Tĩnh',
  'Quảng Trị',
  'Quảng Ngãi',
  'Gia Lai',
  'Khánh Hòa',
  'Lâm Đồng',
  'Đắk Lắk',
  'Đồng Nai',
  'Tây Ninh',
  'Vĩnh Long',
  'Đồng Tháp',
  'Cà Mau',
  'An Giang',
] as const;

export type Province = (typeof PROVINCES)[number];
export type Room = (typeof ROOMS)[number];
export type Style = (typeof STYLES)[number];
export type Material = (typeof MATERIALS)[number];
