/**
 * Seed dữ liệu ban đầu: admin, customer mẫu (chỉ ngoài production), cây danh mục, sản phẩm mẫu,
 * vùng giao hàng, mã giảm giá.
 * Chạy: npm run db:seed. Chạy lại nhiều lần vẫn an toàn (upsert theo email / slug,
 * không ghi đè mật khẩu của tài khoản đã có).
 *
 * Biến môi trường (tùy chọn):
 *   SEED_ADMIN_EMAIL     mặc định admin@homedecor.local
 *   SEED_ADMIN_PASSWORD  bỏ trống thì sinh ngẫu nhiên và in ra một lần
 */
import { PrismaClient, ProductStatus, PromotionType, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { computeProductSummary } from '../src/app/products/product-summary';
import { PROVINCES } from '../src/common/constants/catalog.const';
import { SEED_PRODUCTS } from './seed-data/products';

try {
  process.loadEnvFile('.env');
} catch {
  // không có .env thì dùng biến môi trường sẵn có
}

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const isProduction = process.env.NODE_ENV === 'production';

const CATEGORY_TREE: Record<string, string[]> = {
  'Phòng khách': ['Sofa', 'Bàn trà', 'Kệ TV', 'Ghế thư giãn'],
  'Phòng ngủ': ['Giường', 'Tủ đầu giường', 'Bàn trang điểm'],
  'Phòng ăn': ['Bàn ăn', 'Ghế ăn', 'Tủ bếp'],
  'Trang trí': ['Đèn', 'Tranh', 'Gương', 'Thảm', 'Bình hoa', 'Nến thơm', 'Cây giả'],
  'Lưu trữ': ['Kệ sách', 'Tủ quần áo', 'Giỏ mây'],
};

/** "Bàn trà" -> "ban-tra" */
const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Tạo user nếu chưa có. Đã có thì chỉ bảo đảm role / status, KHÔNG đổi mật khẩu. */
async function upsertUser(params: {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}) {
  const existed = await prisma.user.findUnique({
    where: { email: params.email },
    select: { id: true },
  });
  await prisma.user.upsert({
    where: { email: params.email },
    create: {
      ...params,
      password: await bcrypt.hash(params.password, SALT_ROUNDS),
    },
    update: { role: params.role, status: UserStatus.active, deletedAt: null },
  });
  return !existed;
}

async function seedUsers() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@homedecor.local';
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? randomBytes(9).toString('base64url');

  const created = await upsertUser({
    email: adminEmail,
    password: adminPassword,
    fullName: 'Quản trị viên',
    role: Role.admin,
  });
  if (!created) {
    console.log(`• Admin ${adminEmail} đã tồn tại (giữ nguyên mật khẩu)`);
  } else if (process.env.SEED_ADMIN_PASSWORD) {
    console.log(`• Đã tạo admin ${adminEmail} (mật khẩu lấy từ SEED_ADMIN_PASSWORD)`);
  } else {
    console.log(`• Đã tạo admin ${adminEmail} / mật khẩu: ${adminPassword}`);
    console.log('  → Lưu lại mật khẩu này, nó chỉ hiện một lần. Nên đổi sau khi đăng nhập.');
  }

  if (isProduction) return; // không tạo tài khoản mẫu trên production

  const customers = [
    { email: 'customer1@homedecor.local', fullName: 'Nguyễn Văn An' },
    { email: 'customer2@homedecor.local', fullName: 'Trần Thị Bình' },
  ];
  for (const c of customers) {
    const isNew = await upsertUser({ ...c, password: 'customer123', role: Role.customer });
    console.log(`• Customer ${c.email}${isNew ? ' / mật khẩu: customer123' : ' đã tồn tại'}`);
  }
}

async function seedCategories() {
  let sortOrder = 0;
  let count = 0;
  for (const [parentName, children] of Object.entries(CATEGORY_TREE)) {
    const parent = await prisma.category.upsert({
      where: { slug: slugify(parentName) },
      create: { name: parentName, slug: slugify(parentName), sortOrder: sortOrder++ },
      update: {},
    });
    count++;
    for (const [i, name] of children.entries()) {
      await prisma.category.upsert({
        where: { slug: slugify(name) },
        create: { name, slug: slugify(name), parentID: parent.id, sortOrder: i },
        update: {},
      });
      count++;
    }
  }
  console.log(`• ${count} danh mục (${Object.keys(CATEGORY_TREE).length} danh mục cha)`);
}

/**
 * Sản phẩm mẫu. Bỏ qua sản phẩm đã có (theo slug) hoặc có SKU đã tồn tại,
 * nên chạy lại không bị trùng. minPrice / maxPrice / colors tính bằng đúng hàm của API.
 */
async function seedProducts() {
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryIDBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  let created = 0;
  let skipped = 0;

  for (const [index, { category, variants, ...product }] of SEED_PRODUCTS.entries()) {
    const slug = slugify(product.name);
    const categoryID = categoryIDBySlug.get(category);
    if (!categoryID) throw new Error(`Seed: chưa có danh mục "${category}"`);

    const [existedProduct, existedSku] = await Promise.all([
      prisma.product.findUnique({ where: { slug }, select: { id: true } }),
      prisma.productVariant.findFirst({
        where: { sku: { in: variants.map((v) => v.sku) } },
        select: { id: true },
      }),
    ]);
    if (existedProduct || existedSku) {
      skipped++;
      continue;
    }

    await prisma.product.create({
      data: {
        ...product,
        slug,
        categoryID,
        status: ProductStatus.active,
        images: [
          {
            url: `https://placehold.co/800x800/EEE/333?text=${encodeURIComponent(product.name)}`,
            alt: product.name,
            sortOrder: 0,
          },
        ],
        soldCount: (index * 7) % 40, // để sắp xếp "bán chạy" có dữ liệu
        ...computeProductSummary(variants.map((v) => ({ ...v, isActive: true }))),
        variants: { create: variants },
      },
    });
    created++;
  }
  console.log(`• Sản phẩm: tạo mới ${created}, bỏ qua ${skipped} (đã có)`);
}

/** 5 vùng giao hàng (plan mục 13). Mỗi tỉnh thuộc đúng 1 vùng, kiểm tra trước khi ghi. */
const SHIPPING_ZONES = [
  {
    name: 'Nội thành HCM',
    provinces: ['Hồ Chí Minh'],
    baseFee: 30_000, baseWeightKg: 5, feePerKg: 5_000, bulkySurcharge: 150_000, freeShipThreshold: 5_000_000, estimatedDays: 2,
  },
  {
    name: 'Nội thành HN',
    provinces: ['Hà Nội'],
    baseFee: 30_000, baseWeightKg: 5, feePerKg: 5_000, bulkySurcharge: 150_000, freeShipThreshold: 5_000_000, estimatedDays: 2,
  },
  {
    name: 'Miền Nam',
    provinces: ['Đồng Nai', 'Tây Ninh', 'Vĩnh Long', 'Đồng Tháp', 'Cần Thơ', 'An Giang', 'Cà Mau'],
    baseFee: 40_000, baseWeightKg: 5, feePerKg: 6_000, bulkySurcharge: 250_000, freeShipThreshold: 10_000_000, estimatedDays: 3,
  },
  {
    name: 'Miền Trung',
    provinces: ['Thanh Hóa', 'Nghệ An', 'Hà Tĩnh', 'Quảng Trị', 'Huế', 'Đà Nẵng', 'Quảng Ngãi', 'Gia Lai', 'Khánh Hòa', 'Đắk Lắk', 'Lâm Đồng'],
    baseFee: 50_000, baseWeightKg: 5, feePerKg: 8_000, bulkySurcharge: 350_000, freeShipThreshold: 15_000_000, estimatedDays: 5,
  },
  {
    name: 'Miền Bắc',
    provinces: ['Hải Phòng', 'Quảng Ninh', 'Bắc Ninh', 'Hưng Yên', 'Ninh Bình', 'Phú Thọ', 'Thái Nguyên', 'Tuyên Quang', 'Lào Cai', 'Lạng Sơn', 'Cao Bằng', 'Điện Biên', 'Lai Châu', 'Sơn La'],
    baseFee: 50_000, baseWeightKg: 5, feePerKg: 8_000, bulkySurcharge: 350_000, freeShipThreshold: 15_000_000, estimatedDays: 5,
  },
];

/** Vùng chưa có (theo tên) thì tạo, đã có thì giữ nguyên (admin có thể đã sửa phí). */
async function seedShippingZones() {
  const all = SHIPPING_ZONES.flatMap((z) => z.provinces);
  const missing = PROVINCES.filter((p) => !all.includes(p));
  const unknown = all.filter((p) => !(PROVINCES as readonly string[]).includes(p));
  if (missing.length || unknown.length || new Set(all).size !== all.length) {
    throw new Error(`Seed vùng giao hàng sai: thiếu [${missing}], tỉnh lạ [${unknown}], hoặc tỉnh bị trùng`);
  }

  let created = 0;
  for (const zone of SHIPPING_ZONES) {
    const existed = await prisma.shippingZone.findFirst({ where: { name: zone.name }, select: { id: true } });
    if (existed) continue;
    await prisma.shippingZone.create({ data: zone });
    created++;
  }
  console.log(`• Vùng giao hàng: tạo mới ${created}/${SHIPPING_ZONES.length}`);
}

async function seedPromotions() {
  const promotions = [
    { code: 'WELCOME10', name: 'Giảm 10% cho khách mới', type: PromotionType.percentage, value: 10, maxDiscount: 500_000, perUserLimit: 1 },
    { code: 'FREESHIP', name: 'Miễn phí vận chuyển đơn từ 2 triệu', type: PromotionType.free_shipping, value: 0, minOrderValue: 2_000_000 },
    { code: 'GIAM200K', name: 'Giảm 200.000đ đơn từ 3 triệu', type: PromotionType.fixed_amount, value: 200_000, minOrderValue: 3_000_000, usageLimit: 100 },
  ];
  let created = 0;
  for (const promotion of promotions) {
    const existed = await prisma.promotion.findUnique({ where: { code: promotion.code }, select: { id: true } });
    if (existed) continue;
    await prisma.promotion.create({ data: { ...promotion, startsAt: new Date() } });
    created++;
  }
  console.log(`• Mã giảm giá: tạo mới ${created}/${promotions.length}`);
}

async function main() {
  console.log('Seeding...');
  await seedUsers();
  await seedCategories();
  await seedProducts();
  await seedShippingZones();
  await seedPromotions();
  console.log('Xong.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
