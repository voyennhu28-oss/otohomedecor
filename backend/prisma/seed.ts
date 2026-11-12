/**
 * Seed dữ liệu ban đầu: admin, customer mẫu (chỉ ngoài production), cây danh mục.
 * Chạy: npm run db:seed. Chạy lại nhiều lần vẫn an toàn (upsert theo email / slug,
 * không ghi đè mật khẩu của tài khoản đã có).
 *
 * Biến môi trường (tùy chọn):
 *   SEED_ADMIN_EMAIL     mặc định admin@homedecor.local
 *   SEED_ADMIN_PASSWORD  bỏ trống thì sinh ngẫu nhiên và in ra một lần
 */
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

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

async function main() {
  console.log('Seeding...');
  await seedUsers();
  await seedCategories();
  console.log('Xong.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
