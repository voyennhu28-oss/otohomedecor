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
  'coastal',
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
  'capiz',
  'seashell',
  'mother-of-pearl',
  'conch',
  'coconut-shell',
  'driftwood',
  'jute',
] as const;

export const COLOR_OPTION_NAMES = ['mau', 'mau-sac', 'color'];

export const PROVINCES = [
  'Hà Nội',
  'Hải Phòng',
  'Huế',
  'Đà Nẵng',
  'Hồ Chí Minh',
  'Cần Thơ',
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
