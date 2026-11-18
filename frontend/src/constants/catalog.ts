export const ROOMS = {
  'living-room': 'Phòng khách',
  bedroom: 'Phòng ngủ',
  'dining-room': 'Phòng ăn',
  kitchen: 'Nhà bếp',
  office: 'Phòng làm việc',
  bathroom: 'Phòng tắm',
  outdoor: 'Ngoài trời',
  kids: 'Phòng trẻ em',
} as const;

export const STYLES = {
  scandinavian: 'Bắc Âu',
  japandi: 'Japandi',
  indochine: 'Đông Dương',
  minimalist: 'Tối giản',
  industrial: 'Công nghiệp',
  vintage: 'Vintage',
  modern: 'Hiện đại',
  boho: 'Boho',
} as const;

export const MATERIALS = {
  oak: 'Gỗ sồi',
  walnut: 'Gỗ óc chó',
  ash: 'Gỗ tần bì',
  rattan: 'Mây',
  bamboo: 'Tre',
  ceramic: 'Gốm sứ',
  metal: 'Kim loại',
  glass: 'Thủy tinh',
  fabric: 'Vải',
  leather: 'Da',
  marble: 'Đá cẩm thạch',
  linen: 'Vải lanh',
} as const;

export type Room = keyof typeof ROOMS;
export type Style = keyof typeof STYLES;
export type Material = keyof typeof MATERIALS;

export const PRODUCT_STATUSES = {
  draft: 'Nháp',
  active: 'Đang bán',
  inactive: 'Ngừng bán',
} as const;

export type ProductStatus = keyof typeof PRODUCT_STATUSES;
