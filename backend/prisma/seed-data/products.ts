/**
 * Sản phẩm mẫu cho `npm run db:seed` (plan mục 13): đèn trang trí làm từ vỏ sò, vỏ điệp, xà cừ, vỏ ốc.
 * 27 sản phẩm, 1–6 variant mỗi sản phẩm.
 * `category` là slug danh mục con đã seed (den-tha, den-chum, den-ban...).
 */
import type { Material, Room, Style } from '../../src/common/constants/catalog.const';

export interface SeedVariant {
  sku: string;
  name: string;
  options: { name: string; value: string }[];
  price: number;
  compareAtPrice?: number;
  stock: number;
  weightKg: number;
  dimensions: { lengthCm: number; widthCm: number; heightCm: number };
}

export interface SeedProduct {
  name: string;
  category: string;
  shortDescription: string;
  rooms: Room[];
  styles: Style[];
  materials: Material[];
  tags?: string[];
  requiresAssembly?: boolean;
  assemblyFee?: number;
  allowBackorder?: boolean;
  leadTimeDays?: number;
  warrantyMonths?: number;
  isFeatured?: boolean;
  variants: SeedVariant[];
}

/** [nhãn kích thước, giá, [dài, rộng, cao] cm, cân nặng kg] */
type Size = [label: string, price: number, dims: [number, number, number], weightKg: number];

/**
 * Sinh variant từ tổ hợp kích thước × màu.
 * Vd matrix('THA-HALONG', [['Ø30', ...], ['Ø40', ...]], ['Trắng tự nhiên', 'Ánh ngọc trai']) → 4 variant.
 * Không có kích thước thì truyền [['', giá, dims, kg]]; không có màu thì truyền [].
 */
const matrix = (skuPrefix: string, sizes: Size[], colors: string[], stock = 12): SeedVariant[] => {
  const colorList = colors.length ? colors : [''];
  return sizes.flatMap(([size, price, [l, w, h], weightKg], sizeIndex) =>
    colorList.map((color, colorIndex) => {
      const options = [
        ...(size ? [{ name: 'Kích thước', value: size }] : []),
        ...(color ? [{ name: 'Màu', value: color }] : []),
      ];
      return {
        sku: [skuPrefix, sizeIndex + 1, color && colorIndex + 1].filter(Boolean).join('-'),
        name: options.map((o) => o.value).join(' - ') || 'Mặc định',
        options,
        price,
        compareAtPrice: sizeIndex === 0 && colorIndex === 0 ? Math.round(price * 1.15 / 10_000) * 10_000 : undefined,
        stock: (stock + sizeIndex * 3 + colorIndex * 2) % 20,
        weightKg,
        dimensions: { lengthCm: l, widthCm: w, heightCm: h },
      };
    }),
  );
};

/** Màu vỏ dùng chung cho nhiều mẫu */
const SHELL = {
  natural: 'Trắng tự nhiên',
  pearl: 'Ánh ngọc trai',
  champagne: 'Vàng champagne',
  coral: 'Hồng san hô',
} as const;

export const SEED_PRODUCTS: SeedProduct[] = [
  // ── Đèn trần ──
  {
    name: 'Đèn thả vỏ điệp Hạ Long',
    category: 'den-tha',
    shortDescription: 'Hàng trăm mảnh vỏ điệp xếp lớp, ánh sáng xuyên qua mềm và lấp lánh. Đuôi E27.',
    rooms: ['living-room', 'dining-room'], styles: ['coastal', 'modern'], materials: ['capiz', 'metal'],
    tags: ['thu-cong', 'ban-chay'], warrantyMonths: 12, isFeatured: true,
    variants: matrix(
      'THA-HALONG',
      [['Ø30', 1_290_000, [32, 32, 30], 1.6], ['Ø40', 1_690_000, [42, 42, 38], 2.3], ['Ø50', 2_190_000, [52, 52, 45], 3.1]],
      [SHELL.natural, SHELL.pearl],
    ),
  },
  {
    name: 'Đèn thả cầu vỏ sò Ngọc Trai',
    category: 'den-tha',
    shortDescription: 'Quả cầu kết từ vỏ sò nguyên con, hợp đặt trên bàn ăn hoặc đầu giường.',
    rooms: ['dining-room', 'bedroom'], styles: ['coastal', 'boho'], materials: ['seashell', 'metal'],
    tags: ['thu-cong'], warrantyMonths: 12,
    variants: matrix('THA-NGOCTRAI', [['Ø25', 890_000, [27, 27, 27], 1.1], ['Ø35', 1_290_000, [37, 37, 37], 1.8]], []),
  },
  {
    name: 'Đèn thả xà cừ Bình Minh',
    category: 'den-tha',
    shortDescription: 'Tấm xà cừ mài mỏng ghép trên khung kim loại, ánh lên sắc cầu vồng khi bật đèn.',
    rooms: ['living-room', 'dining-room'], styles: ['modern', 'indochine'], materials: ['mother-of-pearl', 'metal'],
    warrantyMonths: 12, isFeatured: true,
    variants: matrix('THA-BINHMINH', [['', 2_450_000, [40, 40, 35], 2.4]], ['Khung đồng', 'Khung đen']),
  },
  {
    name: 'Đèn thả ốc biển Hải Âu',
    category: 'den-tha',
    shortDescription: 'Chuỗi vỏ ốc biển treo trên thanh gỗ lũa, mỗi chiếc một dáng vì làm tay.',
    rooms: ['living-room', 'outdoor'], styles: ['coastal', 'boho'], materials: ['conch', 'driftwood', 'jute'],
    tags: ['thu-cong', 'dat-lam'], allowBackorder: true, leadTimeDays: 10, warrantyMonths: 6,
    variants: matrix('THA-HAIAU', [['', 1_590_000, [60, 20, 70], 2.8]], []),
  },
  {
    name: 'Đèn chùm vỏ điệp 3 tầng Thác Nước',
    category: 'den-chum',
    shortDescription: 'Ba tầng rèm vỏ điệp buông thẳng, điểm nhấn cho phòng khách trần cao.',
    rooms: ['living-room'], styles: ['coastal', 'modern'], materials: ['capiz', 'metal'],
    tags: ['thu-cong', 'dat-lam'], requiresAssembly: true, assemblyFee: 200_000,
    allowBackorder: true, leadTimeDays: 14, warrantyMonths: 12, isFeatured: true,
    variants: matrix(
      'CHUM-THACNUOC',
      [['Ø50', 3_900_000, [55, 55, 70], 5.5], ['Ø70', 5_900_000, [75, 75, 90], 8], ['Ø90', 8_500_000, [95, 95, 110], 12]],
      [SHELL.natural, SHELL.champagne],
    ),
  },
  {
    name: 'Đèn chùm vỏ sò Hội An',
    category: 'den-chum',
    shortDescription: 'Khung tre uốn tay kết vỏ sò, mang tinh thần phố cổ.',
    rooms: ['living-room', 'dining-room'], styles: ['indochine', 'coastal'], materials: ['seashell', 'bamboo'],
    tags: ['thu-cong'], requiresAssembly: true, assemblyFee: 150_000, warrantyMonths: 12,
    variants: matrix('CHUM-HOIAN', [['Ø60', 4_800_000, [65, 65, 75], 6.5]], [SHELL.natural, SHELL.coral]),
  },
  {
    name: 'Đèn chùm xà cừ Pha Lê Biển',
    category: 'den-chum',
    shortDescription: 'Cánh xà cừ kết hợp chao thủy tinh, cho sảnh và phòng khách sang trọng.',
    rooms: ['living-room'], styles: ['modern', 'vintage'], materials: ['mother-of-pearl', 'glass', 'metal'],
    requiresAssembly: true, assemblyFee: 300_000, warrantyMonths: 18,
    variants: matrix('CHUM-PHALE', [['6 bóng', 7_900_000, [70, 70, 60], 9], ['9 bóng', 10_900_000, [90, 90, 70], 13]], ['Khung đồng']),
  },
  {
    name: 'Đèn ốp trần vỏ điệp Hoa Sen',
    category: 'den-op-tran',
    shortDescription: 'Cánh vỏ điệp xếp hình hoa sen, LED tích hợp 3 chế độ màu, hợp trần thấp.',
    rooms: ['bedroom', 'living-room'], styles: ['indochine', 'minimalist'], materials: ['capiz', 'metal'],
    warrantyMonths: 12,
    variants: matrix('OPTRAN-HOASEN', [['Ø40', 1_890_000, [42, 42, 15], 2.2], ['Ø50', 2_390_000, [52, 52, 16], 2.9]], [SHELL.natural, SHELL.pearl]),
  },
  {
    name: 'Đèn ốp trần vỏ sò Sóng Biển',
    category: 'den-op-tran',
    shortDescription: 'Vỏ sò xếp vòng như con sóng, LED tích hợp, lắp được cho hành lang và phòng tắm.',
    rooms: ['bathroom', 'bedroom'], styles: ['coastal'], materials: ['seashell', 'metal'],
    warrantyMonths: 12,
    variants: matrix('OPTRAN-SONGBIEN', [['Ø45', 1_650_000, [47, 47, 14], 2.4]], []),
  },

  // ── Đèn tường ──
  {
    name: 'Đèn vách vỏ điệp Vầng Trăng',
    category: 'den-vach',
    shortDescription: 'Chao bán nguyệt bằng vỏ điệp, hắt sáng lên tường tạo vệt sáng dịu.',
    rooms: ['bedroom', 'living-room'], styles: ['coastal', 'minimalist'], materials: ['capiz', 'metal'],
    warrantyMonths: 12,
    variants: matrix('VACH-VANGTRANG', [['', 690_000, [30, 15, 20], 0.8]], [SHELL.natural, SHELL.pearl], 16),
  },
  {
    name: 'Đèn vách vỏ ốc Nautilus',
    category: 'den-vach',
    shortDescription: 'Một vỏ ốc Nautilus cắt đôi gắn trên tay đèn kim loại, mỗi chiếc vân khác nhau.',
    rooms: ['living-room', 'office'], styles: ['vintage', 'coastal'], materials: ['conch', 'metal'],
    tags: ['thu-cong'], warrantyMonths: 12,
    variants: matrix('VACH-NAUTILUS', [['', 1_150_000, [25, 18, 30], 1]], ['Khung đồng', 'Khung đen']),
  },
  {
    name: 'Đèn soi gương xà cừ Lumi',
    category: 'den-soi-guong',
    shortDescription: 'Thanh đèn soi gương ốp xà cừ, chống ẩm, lắp trên gương phòng tắm hoặc bàn trang điểm.',
    rooms: ['bathroom', 'bedroom'], styles: ['modern', 'minimalist'], materials: ['mother-of-pearl', 'metal'],
    warrantyMonths: 12,
    variants: matrix('GUONG-LUMI', [['40cm', 1_350_000, [40, 8, 8], 0.9], ['60cm', 1_750_000, [60, 8, 8], 1.2]], []),
  },

  // ── Đèn bàn & đèn cây ──
  {
    name: 'Đèn bàn vỏ điệp Nấm Biển',
    category: 'den-ban',
    shortDescription: 'Dáng nấm, chao vỏ điệp, đế gốm men trắng. Hợp bàn làm việc và kệ phòng khách.',
    rooms: ['office', 'living-room', 'bedroom'], styles: ['modern', 'japandi'], materials: ['capiz', 'ceramic'],
    tags: ['ban-chay'], warrantyMonths: 12, isFeatured: true,
    variants: matrix('BAN-NAMBIEN', [['', 1_190_000, [28, 28, 38], 2]], [SHELL.natural, SHELL.pearl, SHELL.champagne]),
  },
  {
    name: 'Đèn bàn xà cừ Tân Cổ Điển',
    category: 'den-ban',
    shortDescription: 'Thân đèn khảm xà cừ thủ công, chao vải lanh, mang hơi hướng Đông Dương.',
    rooms: ['living-room', 'office'], styles: ['indochine', 'vintage'], materials: ['mother-of-pearl', 'metal', 'linen'],
    tags: ['thu-cong'], warrantyMonths: 12,
    variants: matrix('BAN-TANCODIEN', [['', 2_650_000, [35, 35, 58], 3.2]], ['Chao kem', 'Chao xanh rêu']),
  },
  {
    name: 'Đèn bàn vỏ sò đế gỗ lũa',
    category: 'den-ban',
    shortDescription: 'Đế gỗ lũa nhặt từ bờ biển, chao kết vỏ sò. Không chiếc nào giống chiếc nào.',
    rooms: ['living-room', 'bedroom'], styles: ['coastal', 'boho'], materials: ['seashell', 'driftwood'],
    tags: ['thu-cong', 'dat-lam'], allowBackorder: true, leadTimeDays: 7, warrantyMonths: 6,
    variants: matrix('BAN-GOLUA', [['', 1_490_000, [30, 30, 50], 2.6]], []),
  },
  {
    name: 'Đèn ngủ vỏ điệp tự nhiên Mini',
    category: 'den-ngu',
    shortDescription: 'Vỏ điệp nguyên con dựng trên đế gỗ, bóng LED ấm, cắm USB.',
    rooms: ['bedroom', 'kids'], styles: ['coastal', 'minimalist'], materials: ['seashell', 'ash'],
    tags: ['qua-tang'], warrantyMonths: 6,
    variants: matrix('NGU-MINI', [['', 390_000, [15, 10, 18], 0.4]], [SHELL.natural, SHELL.coral], 19),
  },
  {
    name: 'Đèn ngủ gáo dừa khảm xà cừ',
    category: 'den-ngu',
    shortDescription: 'Gáo dừa đục lỗ khảm xà cừ, chiếu bóng hoa văn lên tường khi bật đèn.',
    rooms: ['bedroom', 'kids'], styles: ['indochine', 'boho'], materials: ['coconut-shell', 'mother-of-pearl'],
    tags: ['thu-cong', 'qua-tang'], warrantyMonths: 6,
    variants: matrix('NGU-GAODUA', [['', 590_000, [18, 18, 20], 0.6]], [], 17),
  },
  {
    name: 'Đèn cây vỏ điệp Hải Đăng',
    category: 'den-cay-dung',
    shortDescription: 'Chao trụ vỏ điệp cao, chân gỗ tần bì ba chân, chiếu sáng góc đọc sách.',
    rooms: ['living-room', 'bedroom'], styles: ['coastal', 'scandinavian'], materials: ['capiz', 'ash'],
    requiresAssembly: true, assemblyFee: 50_000, warrantyMonths: 12,
    variants: matrix('CAY-HAIDANG', [['Cao 150cm', 3_200_000, [45, 45, 150], 6], ['Cao 170cm', 3_600_000, [45, 45, 170], 6.8]], [SHELL.natural, SHELL.pearl]),
  },

  // ── Đèn trang trí ──
  {
    name: 'Đèn lồng vỏ điệp Phố Hội',
    category: 'den-long',
    shortDescription: 'Đèn lồng dáng truyền thống, thay lụa bằng vỏ điệp mỏng, treo hiên hoặc phòng khách.',
    rooms: ['living-room', 'outdoor'], styles: ['indochine', 'coastal'], materials: ['capiz', 'bamboo'],
    tags: ['thu-cong', 'qua-tang'], warrantyMonths: 6,
    variants: matrix(
      'LONG-PHOHOI',
      [['Cao 30cm', 650_000, [25, 25, 30], 0.9], ['Cao 45cm', 950_000, [35, 35, 45], 1.4]],
      [SHELL.natural, SHELL.champagne, SHELL.coral],
    ),
  },
  {
    name: 'Đèn lồng xà cừ lục giác',
    category: 'den-long',
    shortDescription: 'Sáu mặt xà cừ ghép khung kim loại, dùng điện hoặc thắp nến.',
    rooms: ['living-room', 'dining-room'], styles: ['vintage', 'indochine'], materials: ['mother-of-pearl', 'metal'],
    warrantyMonths: 6,
    variants: matrix('LONG-LUCGIAC', [['', 1_250_000, [25, 22, 40], 1.5]], ['Khung đồng', 'Khung đen']),
  },
  {
    name: 'Dây đèn LED vỏ sò',
    category: 'den-day',
    shortDescription: 'Mỗi bóng LED nằm trong một vỏ sò nhỏ, dùng pin AA hoặc USB, treo đầu giường, cửa sổ.',
    rooms: ['bedroom', 'kids', 'living-room'], styles: ['coastal', 'boho'], materials: ['seashell'],
    tags: ['qua-tang', 'ban-chay'], warrantyMonths: 3,
    variants: matrix('DAY-VOSO', [['3m - 20 bóng', 290_000, [20, 15, 8], 0.3], ['6m - 40 bóng', 490_000, [25, 20, 10], 0.5]], [], 18),
  },
  {
    name: 'Dây đèn vỏ ốc biển',
    category: 'den-day',
    shortDescription: 'Vỏ ốc tự nhiên xâu dây đay, đèn LED ấm, trang trí quán cà phê hoặc ban công.',
    rooms: ['living-room', 'outdoor'], styles: ['coastal', 'boho'], materials: ['conch', 'jute'],
    warrantyMonths: 3,
    variants: matrix('DAY-VOOC', [['2m', 350_000, [20, 15, 10], 0.6]], [], 15),
  },
  {
    name: 'Đèn treo hiên vỏ điệp chống ẩm',
    category: 'den-ngoai-troi',
    shortDescription: 'Vỏ điệp phủ lớp sơn bóng chống ẩm, dây đay chịu nắng, treo hiên nhà hay homestay biển.',
    rooms: ['outdoor'], styles: ['coastal'], materials: ['capiz', 'jute'],
    tags: ['ngoai-troi'], warrantyMonths: 6,
    variants: matrix('NGOAI-HIEN', [['', 1_390_000, [35, 35, 45], 1.8]], [SHELL.natural, SHELL.pearl]),
  },
  {
    name: 'Đèn chuông gió vỏ sò năng lượng mặt trời',
    category: 'den-ngoai-troi',
    shortDescription: 'Chuông gió vỏ sò kèm đèn LED sạc bằng tấm pin mặt trời, tự sáng khi trời tối.',
    rooms: ['outdoor'], styles: ['coastal', 'boho'], materials: ['seashell', 'driftwood'],
    tags: ['ngoai-troi', 'qua-tang'], warrantyMonths: 6,
    variants: matrix('NGOAI-CHUONGGIO', [['', 450_000, [20, 20, 60], 0.7]], [], 14),
  },

  // ── Phụ kiện đèn ──
  {
    name: 'Chụp đèn vỏ điệp tròn đuôi E27',
    category: 'chup-den-thay-the',
    shortDescription: 'Chụp đèn rời để thay cho đèn cũ, lắp vừa đui E27 phổ biến.',
    rooms: ['living-room', 'bedroom', 'dining-room'], styles: ['coastal', 'minimalist'], materials: ['capiz'],
    variants: matrix(
      'CHUP-TRON',
      [['Ø30', 490_000, [32, 32, 25], 0.7], ['Ø40', 690_000, [42, 42, 32], 1], ['Ø50', 890_000, [52, 52, 38], 1.4]],
      [SHELL.natural],
    ),
  },
  {
    name: 'Chụp đèn vỏ sò hình côn',
    category: 'chup-den-thay-the',
    shortDescription: 'Chụp côn kết vỏ sò, dùng cho đèn bàn hoặc đèn cây đuôi E27.',
    rooms: ['living-room', 'bedroom'], styles: ['coastal', 'boho'], materials: ['seashell'],
    variants: matrix('CHUP-CON', [['', 590_000, [35, 35, 28], 0.9]], [SHELL.natural, SHELL.coral]),
  },
  {
    name: 'Bóng LED Edison dây tóc 4W E27',
    category: 'bong-den',
    shortDescription: 'Bóng dây tóc LED tiết kiệm điện, hợp với mọi đèn vỏ điệp của shop.',
    rooms: ['living-room', 'bedroom', 'dining-room'], styles: ['vintage', 'modern'], materials: ['glass'],
    warrantyMonths: 12,
    variants: [
      {
        sku: 'BONG-EDISON-2700',
        name: '2700K vàng ấm',
        options: [{ name: 'Ánh sáng', value: '2700K vàng ấm' }],
        price: 65_000,
        stock: 120,
        weightKg: 0.1,
        dimensions: { lengthCm: 7, widthCm: 7, heightCm: 14 },
      },
      {
        sku: 'BONG-EDISON-4000',
        name: '4000K trung tính',
        options: [{ name: 'Ánh sáng', value: '4000K trung tính' }],
        price: 65_000,
        stock: 80,
        weightKg: 0.1,
        dimensions: { lengthCm: 7, widthCm: 7, heightCm: 14 },
      },
    ],
  },
];
