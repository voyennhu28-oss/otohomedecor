export type PlaceholderProduct = {
  slug: string;
  name: string;
  detail: string;
  price: number;
  photo: string;
};

export const FEATURED_PRODUCTS: PlaceholderProduct[] = [
  {
    slug: 'den-so-diep-tron',
    name: 'Đèn sò điệp tròn',
    detail: 'Vỏ sò điệp, đế gỗ',
    price: 890_000,
    photo: 'Ảnh sản phẩm: đèn sò điệp dáng tròn, đang bật',
  },
  {
    slug: 'den-vo-oc-xoan',
    name: 'Đèn vỏ ốc xoắn',
    detail: 'Vỏ ốc, đế gỗ',
    price: 650_000,
    photo: 'Ảnh sản phẩm: đèn vỏ ốc xoắn',
  },
  {
    slug: 'den-ban-xa-cu',
    name: 'Đèn bàn xà cừ',
    detail: 'Mảnh xà cừ, chân kim loại',
    price: 1_250_000,
    photo: 'Ảnh sản phẩm: đèn bàn chao ghép mảnh xà cừ',
  },
  {
    slug: 'den-vo-trai',
    name: 'Đèn vỏ trai',
    detail: 'Vỏ trai, đế gỗ',
    price: 720_000,
    photo: 'Ảnh sản phẩm: đèn vỏ trai đặt nghiêng',
  },
  {
    slug: 'den-treo-so-diep',
    name: 'Đèn treo sò điệp',
    detail: 'Vỏ sò điệp, khung tre',
    price: 1_590_000,
    photo: 'Ảnh sản phẩm: đèn treo ghép nhiều lớp sò điệp',
  },
];

export const MAKING_STEPS: { title: string; note: string }[] = [
  {
    title: 'Chọn vỏ',
    note: 'Chọn vỏ nguyên, không nứt, vân rõ. Vỏ mỏng cho ánh sáng đi qua nhiều hơn.',
  },
  {
    title: 'Làm sạch',
    note: 'Ngâm, rửa và phơi khô để vỏ hết mùi biển mà vẫn giữ màu tự nhiên.',
  },
  {
    title: 'Ghép tay',
    note: 'Ghép từng vỏ lên khung đèn. Mỗi vỏ một dáng nên không chiếc nào giống hệt chiếc nào.',
  },
  {
    title: 'Lắp đèn và bật thử',
    note: 'Lắp bóng, dây và công tắc, rồi bật thử từng chiếc trước khi giao.',
  },
];
