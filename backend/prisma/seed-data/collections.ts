const DAY = 24 * 60 * 60 * 1000;

export interface SeedCollection {
  name: string;
  slug: string;
  description: string;
  isFeatured?: boolean;
  startsInDays?: number;
  endsInDays?: number;
  products: string[];
}

export const SEED_COLLECTIONS: SeedCollection[] = [
  {
    name: 'Hạ Long',
    slug: 'ha-long',
    description:
      'Vỏ điệp mỏng xếp lớp như mặt vịnh lúc chiều, ánh sáng xuyên qua mềm và trong. Dòng đèn đặc trưng của xưởng.',
    isFeatured: true,
    products: [
      'Đèn thả vỏ điệp Hạ Long',
      'Đèn chùm vỏ điệp 3 tầng Thác Nước',
      'Đèn ốp trần vỏ điệp Hoa Sen',
      'Đèn vách vỏ điệp Vầng Trăng',
      'Đèn cây vỏ điệp Hải Đăng',
      'Đèn bàn vỏ điệp Nấm Biển',
      'Chụp đèn vỏ điệp tròn đuôi E27',
    ],
  },
  {
    name: 'Phố Hội',
    slug: 'pho-hoi',
    description:
      'Tre, vỏ sò và những dáng đèn lồng quen thuộc, mang tinh thần Đông Dương vào không gian sống.',
    isFeatured: true,
    products: [
      'Đèn chùm vỏ sò Hội An',
      'Đèn lồng vỏ điệp Phố Hội',
      'Đèn bàn xà cừ Tân Cổ Điển',
      'Đèn ngủ gáo dừa khảm xà cừ',
      'Đèn ốp trần vỏ điệp Hoa Sen',
      'Đèn lồng xà cừ lục giác',
    ],
  },
  {
    name: 'Ánh Xà Cừ',
    slug: 'anh-xa-cu',
    description:
      'Xà cừ mài tay ánh lên sắc cầu vồng mỗi khi bật đèn. Sang trọng nhưng vẫn ấm áp.',
    products: [
      'Đèn thả xà cừ Bình Minh',
      'Đèn chùm xà cừ Pha Lê Biển',
      'Đèn soi gương xà cừ Lumi',
      'Đèn bàn xà cừ Tân Cổ Điển',
      'Đèn lồng xà cừ lục giác',
      'Đèn ngủ gáo dừa khảm xà cừ',
    ],
  },
  {
    name: 'Gió Biển',
    slug: 'gio-bien',
    description:
      'Vỏ ốc, gỗ lũa và dây đay nhặt từ những bờ biển miền Trung. Hợp cho hiên nhà, ban công và homestay.',
    isFeatured: true,
    products: [
      'Đèn thả ốc biển Hải Âu',
      'Đèn thả cầu vỏ sò Ngọc Trai',
      'Đèn ốp trần vỏ sò Sóng Biển',
      'Đèn vách vỏ ốc Nautilus',
      'Đèn bàn vỏ sò đế gỗ lũa',
      'Dây đèn vỏ ốc biển',
      'Đèn treo hiên vỏ điệp chống ẩm',
      'Đèn chuông gió vỏ sò năng lượng mặt trời',
    ],
  },
  {
    name: 'Quà tặng dưới 600k',
    slug: 'qua-tang-duoi-600k',
    description: 'Những món nhỏ xinh, gói quà miễn phí, hợp tặng sinh nhật và tân gia.',
    products: [
      'Đèn ngủ vỏ điệp tự nhiên Mini',
      'Đèn ngủ gáo dừa khảm xà cừ',
      'Dây đèn LED vỏ sò',
      'Dây đèn vỏ ốc biển',
      'Đèn chuông gió vỏ sò năng lượng mặt trời',
    ],
  },
  {
    name: 'Mùa lễ hội',
    slug: 'mua-le-hoi',
    description:
      'Thắp sáng Giáng sinh và Tết bằng ánh đèn vỏ sò. Bộ sưu tập theo mùa, chỉ hiển thị trong dịp lễ.',
    isFeatured: true,
    startsInDays: 0,
    endsInDays: 60,
    products: [
      'Dây đèn LED vỏ sò',
      'Đèn lồng vỏ điệp Phố Hội',
      'Đèn chùm vỏ điệp 3 tầng Thác Nước',
      'Đèn bàn vỏ điệp Nấm Biển',
      'Đèn chuông gió vỏ sò năng lượng mặt trời',
    ],
  },
];

export const seedCollectionSchedule = ({ startsInDays, endsInDays }: SeedCollection) => {
  const now = Date.now();
  return {
    startsAt: startsInDays === undefined ? null : new Date(now + startsInDays * DAY),
    endsAt: endsInDays === undefined ? null : new Date(now + endsInDays * DAY),
  };
};
