/**
 * Sản phẩm mẫu cho `npm run db:seed` (plan mục 13): 25 sản phẩm, 1–4 variant mỗi sản phẩm.
 * `category` là slug danh mục con đã seed (sofa, ban-tra, den...).
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
 * Vd matrix('SOFA-AKI', [['2 chỗ', ...], ['3 chỗ', ...]], ['Be', 'Xám']) → 4 variant.
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

export const SEED_PRODUCTS: SeedProduct[] = [
  // ── Phòng khách ──
  {
    name: 'Sofa băng Aki Japandi',
    category: 'sofa',
    shortDescription: 'Sofa khung gỗ sồi, đệm vải linen chống bám bụi.',
    rooms: ['living-room'], styles: ['japandi', 'minimalist'], materials: ['oak', 'linen'],
    requiresAssembly: true, assemblyFee: 300_000, warrantyMonths: 24, isFeatured: true,
    variants: matrix('SOFA-AKI', [['2 chỗ', 9_900_000, [160, 85, 80], 42], ['3 chỗ', 12_900_000, [210, 85, 80], 55]], ['Be', 'Xám']),
  },
  {
    name: 'Sofa góc chữ L Nordic',
    category: 'sofa',
    shortDescription: 'Sofa góc rộng rãi cho phòng khách gia đình, chân gỗ tần bì.',
    rooms: ['living-room'], styles: ['scandinavian'], materials: ['ash', 'fabric'],
    requiresAssembly: true, assemblyFee: 500_000, warrantyMonths: 24, isFeatured: true,
    variants: matrix('SOFA-NORDIC', [['Góc trái', 18_500_000, [270, 160, 82], 85], ['Góc phải', 18_500_000, [270, 160, 82], 85]], ['Xám đậm', 'Kem']),
  },
  {
    name: 'Sofa da bò Vintage Brown',
    category: 'sofa',
    shortDescription: 'Da bò thật, càng dùng càng lên màu đẹp.',
    rooms: ['living-room', 'office'], styles: ['vintage', 'industrial'], materials: ['leather', 'metal'],
    allowBackorder: true, leadTimeDays: 21, warrantyMonths: 36,
    variants: matrix('SOFA-VINTAGE', [['2 chỗ', 24_000_000, [175, 90, 78], 60], ['3 chỗ', 29_000_000, [220, 90, 78], 75]], ['Nâu bò']),
  },
  {
    name: 'Bàn trà tròn Mây Bali',
    category: 'ban-tra',
    shortDescription: 'Mặt kính cường lực, chân đan mây thủ công.',
    rooms: ['living-room'], styles: ['boho'], materials: ['rattan', 'glass'],
    warrantyMonths: 12, isFeatured: true,
    variants: matrix('BANTRA-BALI', [['Ø60', 2_400_000, [60, 60, 42], 9], ['Ø80', 3_200_000, [80, 80, 42], 13]], []),
  },
  {
    name: 'Bàn trà mặt đá Marble Duo',
    category: 'ban-tra',
    shortDescription: 'Bộ 2 bàn lồng nhau, mặt đá marble trắng vân mây.',
    rooms: ['living-room'], styles: ['modern', 'minimalist'], materials: ['marble', 'metal'],
    warrantyMonths: 12,
    variants: matrix('BANTRA-MARBLE', [['', 5_600_000, [90, 50, 45], 28]], ['Chân vàng', 'Chân đen']),
  },
  {
    name: 'Kệ TV gỗ óc chó Kanso',
    category: 'ke-tv',
    shortDescription: 'Kệ thấp tối giản, ngăn kéo ray giảm chấn.',
    rooms: ['living-room'], styles: ['japandi'], materials: ['walnut'],
    requiresAssembly: true, assemblyFee: 200_000, warrantyMonths: 24,
    variants: matrix('KETV-KANSO', [['1m6', 7_800_000, [160, 40, 45], 38], ['2m', 9_200_000, [200, 40, 45], 46]], []),
  },
  {
    name: 'Ghế thư giãn Lounge Cocoon',
    category: 'ghe-thu-gian',
    shortDescription: 'Ghế bành ôm lưng, kèm đôn gác chân.',
    rooms: ['living-room', 'bedroom'], styles: ['modern', 'scandinavian'], materials: ['fabric', 'oak'],
    warrantyMonths: 18, isFeatured: true,
    variants: matrix('GHE-COCOON', [['', 6_500_000, [80, 85, 95], 18]], ['Xanh rêu', 'Be', 'Cam đất']),
  },

  // ── Phòng ngủ ──
  {
    name: 'Giường gỗ sồi Hinoki',
    category: 'giuong',
    shortDescription: 'Giường bệt kiểu Nhật, gỗ sồi tự nhiên, không cần dát giường.',
    rooms: ['bedroom'], styles: ['japandi', 'minimalist'], materials: ['oak'],
    requiresAssembly: true, assemblyFee: 400_000, warrantyMonths: 36, isFeatured: true,
    variants: matrix('GIUONG-HINOKI', [['1m6 x 2m', 11_500_000, [210, 170, 35], 70], ['1m8 x 2m', 12_900_000, [210, 190, 35], 78]], []),
  },
  {
    name: 'Giường bọc nệm Velvet Cloud',
    category: 'giuong',
    shortDescription: 'Đầu giường bọc nhung, chân kim loại sơn tĩnh điện.',
    rooms: ['bedroom'], styles: ['modern'], materials: ['fabric', 'metal'],
    requiresAssembly: true, assemblyFee: 400_000, warrantyMonths: 24,
    variants: matrix('GIUONG-VELVET', [['1m6 x 2m', 14_200_000, [215, 175, 110], 85], ['1m8 x 2m', 15_800_000, [215, 195, 110], 92]], ['Xám khói', 'Xanh navy']),
  },
  {
    name: 'Tủ đầu giường Mini 2 ngăn',
    category: 'tu-dau-giuong',
    shortDescription: 'Nhỏ gọn, 2 ngăn kéo, phù hợp phòng ngủ nhỏ.',
    rooms: ['bedroom'], styles: ['scandinavian', 'minimalist'], materials: ['ash'],
    requiresAssembly: true, assemblyFee: 50_000, warrantyMonths: 12,
    variants: matrix('TDG-MINI', [['', 1_650_000, [45, 38, 50], 11]], ['Gỗ tự nhiên', 'Trắng']),
  },
  {
    name: 'Bàn trang điểm Muse kèm gương',
    category: 'ban-trang-diem',
    shortDescription: 'Gương tròn có đèn LED 3 chế độ, kèm ghế đôn.',
    rooms: ['bedroom'], styles: ['modern'], materials: ['ash', 'glass'],
    requiresAssembly: true, assemblyFee: 150_000, warrantyMonths: 12,
    variants: matrix('BTD-MUSE', [['', 4_900_000, [100, 40, 140], 30]], ['Trắng', 'Hồng phấn']),
  },

  // ── Phòng ăn ──
  {
    name: 'Bàn ăn gỗ óc chó Tavola',
    category: 'ban-an',
    shortDescription: 'Mặt gỗ óc chó nguyên tấm, chịu nước, dễ lau chùi.',
    rooms: ['dining-room', 'kitchen'], styles: ['modern', 'japandi'], materials: ['walnut'],
    requiresAssembly: true, assemblyFee: 250_000, allowBackorder: true, leadTimeDays: 14, warrantyMonths: 36, isFeatured: true,
    variants: matrix('BANAN-TAVOLA', [['4 ghế (1m4)', 13_500_000, [140, 80, 75], 45], ['6 ghế (1m8)', 17_900_000, [180, 90, 75], 60]], []),
  },
  {
    name: 'Ghế ăn Wishbone',
    category: 'ghe-an',
    shortDescription: 'Thiết kế kinh điển, mặt ngồi đan dây giấy bện.',
    rooms: ['dining-room'], styles: ['scandinavian', 'japandi'], materials: ['oak'],
    warrantyMonths: 12,
    variants: matrix('GHEAN-WISHBONE', [['', 2_900_000, [55, 51, 76], 5]], ['Gỗ tự nhiên', 'Đen'], 18),
  },
  {
    name: 'Tủ bếp trên Modular',
    category: 'tu-bep',
    shortDescription: 'Module tủ treo, ghép linh hoạt theo chiều dài bếp.',
    rooms: ['kitchen'], styles: ['modern', 'minimalist'], materials: ['ash'],
    requiresAssembly: true, assemblyFee: 300_000, allowBackorder: true, leadTimeDays: 10, warrantyMonths: 24,
    variants: matrix('TUBEP-MOD', [['60cm', 3_200_000, [60, 35, 70], 18], ['80cm', 3_900_000, [80, 35, 70], 23]], ['Trắng', 'Xanh sage']),
  },

  // ── Trang trí ──
  {
    name: 'Đèn thả mây Kubo',
    category: 'den',
    shortDescription: 'Chụp đèn đan mây, ánh sáng ấm, đuôi E27.',
    rooms: ['living-room', 'dining-room'], styles: ['boho', 'japandi'], materials: ['rattan'],
    warrantyMonths: 6, isFeatured: true,
    variants: matrix('DEN-KUBO', [['Ø35', 890_000, [35, 35, 28], 1.2], ['Ø50', 1_290_000, [50, 50, 36], 1.8]], []),
  },
  {
    name: 'Đèn cây Arc Floor',
    category: 'den',
    shortDescription: 'Đèn cây cần cong, đế đá marble chống đổ.',
    rooms: ['living-room', 'office'], styles: ['modern', 'industrial'], materials: ['metal', 'marble'],
    warrantyMonths: 12,
    variants: matrix('DEN-ARC', [['', 3_450_000, [180, 40, 200], 16]], ['Đồng', 'Đen nhám']),
  },
  {
    name: 'Tranh canvas Lá Nhiệt Đới (bộ 3)',
    category: 'tranh',
    shortDescription: 'Bộ 3 tranh in canvas, khung composite vân gỗ.',
    rooms: ['living-room', 'bedroom'], styles: ['boho', 'modern'], materials: ['fabric'],
    variants: matrix('TRANH-LA', [['40x60 cm', 1_190_000, [40, 3, 60], 3], ['60x90 cm', 1_890_000, [60, 3, 90], 5]], []),
  },
  {
    name: 'Gương tròn viền mây Sol',
    category: 'guong',
    shortDescription: 'Gương treo tường, viền mây đan hình mặt trời.',
    rooms: ['living-room', 'bathroom', 'bedroom'], styles: ['boho'], materials: ['rattan', 'glass'],
    warrantyMonths: 6,
    variants: matrix('GUONG-SOL', [['Ø60', 1_050_000, [60, 3, 60], 3], ['Ø80', 1_450_000, [80, 3, 80], 4.5]], []),
  },
  {
    name: 'Thảm len dệt tay Berber',
    category: 'tham',
    shortDescription: 'Len New Zealand dệt tay, hoa văn Berber.',
    rooms: ['living-room', 'bedroom'], styles: ['boho', 'scandinavian'], materials: ['fabric'],
    allowBackorder: true, leadTimeDays: 30,
    variants: matrix('THAM-BERBER', [['160x230', 4_200_000, [230, 160, 1], 9], ['200x300', 6_500_000, [300, 200, 1], 14]], ['Kem', 'Xám tro']),
  },
  {
    name: 'Bình gốm men rạn Bát Tràng',
    category: 'binh-hoa',
    shortDescription: 'Gốm thủ công làng Bát Tràng, men rạn cổ.',
    rooms: ['living-room', 'office'], styles: ['indochine', 'vintage'], materials: ['ceramic'],
    variants: matrix('BINH-BATTRANG', [['Cao 25cm', 450_000, [15, 15, 25], 1.1], ['Cao 40cm', 790_000, [22, 22, 40], 2.3]], ['Lam', 'Trắng ngà']),
  },
  {
    name: 'Nến thơm sáp đậu nành Forest',
    category: 'nen-thom',
    shortDescription: 'Sáp đậu nành, tinh dầu tuyết tùng và gỗ đàn hương, cháy 40 giờ.',
    rooms: ['living-room', 'bedroom', 'bathroom'], styles: ['minimalist'], materials: ['glass'],
    variants: matrix('NEN-FOREST', [['200g', 320_000, [8, 8, 9], 0.4]], [], 19),
  },
  {
    name: 'Cây bàng Singapore giả',
    category: 'cay-gia',
    shortDescription: 'Cây giả cao cấp, lá in vân như thật, kèm chậu xi măng.',
    rooms: ['living-room', 'office'], styles: ['modern', 'scandinavian'], materials: ['ceramic'],
    variants: matrix('CAY-BANG', [['1m2', 1_350_000, [40, 40, 120], 5], ['1m6', 1_950_000, [50, 50, 160], 7]], []),
  },

  // ── Lưu trữ ──
  {
    name: 'Kệ sách 5 tầng Ladder',
    category: 'ke-sach',
    shortDescription: 'Kệ dạng thang dựa tường, tiết kiệm diện tích.',
    rooms: ['living-room', 'office', 'kids'], styles: ['scandinavian', 'industrial'], materials: ['ash', 'metal'],
    requiresAssembly: true, assemblyFee: 100_000, warrantyMonths: 12,
    variants: matrix('KESACH-LADDER', [['', 2_350_000, [70, 35, 180], 16]], ['Gỗ tự nhiên', 'Đen']),
  },
  {
    name: 'Tủ quần áo cửa lùa Shoji',
    category: 'tu-quan-ao',
    shortDescription: 'Cửa lùa nan gỗ kiểu Nhật, ray trượt êm.',
    rooms: ['bedroom'], styles: ['japandi'], materials: ['oak'],
    requiresAssembly: true, assemblyFee: 600_000, allowBackorder: true, leadTimeDays: 21, warrantyMonths: 36,
    variants: matrix('TUQA-SHOJI', [['1m6', 16_900_000, [160, 60, 210], 120], ['2m', 19_900_000, [200, 60, 210], 145]], []),
  },
  {
    name: 'Giỏ mây đựng đồ có nắp (bộ 2)',
    category: 'gio-may',
    shortDescription: 'Bộ 2 giỏ đan mây tự nhiên, có lót vải tháo rời.',
    rooms: ['living-room', 'bedroom', 'bathroom', 'kids'], styles: ['boho', 'japandi'], materials: ['rattan', 'linen'],
    variants: matrix('GIOMAY-DUO', [['', 690_000, [40, 30, 35], 2.5]], [], 15),
  },
];
