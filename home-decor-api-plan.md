# Plan: Home Decor API (NestJS + Prisma + MongoDB Atlas)

> Dựa trên project `ecommerce_t11_2025`. Mô hình: **một cửa hàng** (không có vendor).
> Mục tiêu: giữ hạ tầng tốt của project cũ, viết lại schema + nghiệp vụ bán hàng.

---

## 0. Stack

| Thành phần | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | NestJS 11 | như cũ |
| ORM | **Prisma 6.x** (giữ 6.19) | MongoDB chạy ổn định trên Prisma 6; muốn lên v7 phải kiểm tra lại hỗ trợ MongoDB |
| Database | **MongoDB Atlas** | Cluster Atlas luôn là replica set, nên dùng được transaction (kể cả gói free M0) |
| Validate | Zod + nestjs-zod | như cũ |
| Auth | JWT (Bearer + cookie) | sửa vài lỗi, xem mục 5 |
| Upload ảnh | Cloudinary | như cũ |
| Excel | exceljs | chỉ dùng cho admin: import/export sản phẩm, export đơn hàng |
| Cron | `@nestjs/schedule` | **thêm mới**: tự hủy đơn chưa thanh toán |
| Mail | `nodemailer` hoặc `@nestjs-modules/mailer` | **thêm mới**: email xác nhận đơn, quên mật khẩu |

---

## 1. Setup MongoDB Atlas

1. Tạo cluster **M0 (Free)** tại cloud.mongodb.com.
2. **Database Access** → tạo user và password (quyền `readWrite`).
3. **Network Access** → thêm IP máy bạn (dev có thể tạm dùng `0.0.0.0/0`; khi deploy thì thêm IP server).
4. **Connect → Drivers** → copy connection string, **thêm tên database vào sau `/`**:

```env
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.xxxxx.mongodb.net/home_decor?retryWrites=true&w=majority"
```

> Thiếu tên database (`/home_decor`) thì Prisma báo lỗi. Password có ký tự đặc biệt thì phải URL-encode.

---

## 2. Tạo project và mang code từ project cũ sang

```bash
nest new home_decor_api   # chọn npm
cd home_decor_api
```

### 2.1 Copy nguyên (sửa nhẹ)

| Từ project cũ | Ghi chú |
|---|---|
| `.prettierrc`, `eslint.config.mjs`, `commitlint.config.mjs`, `.husky/`, `tsconfig*.json`, `nest-cli.json`, `.gitignore` | giữ nguyên |
| `.example.env` | sửa theo mục 2.4 |
| `src/main.ts`, `src/init.ts` | sửa CORS (mục 2.3) |
| `src/logger/**` | giữ nguyên |
| `src/catch-everything/**` | **thêm map lỗi Prisma** (mục 6.3) |
| `src/common/decorators/**` | `user.decorator.ts`: thêm `role` vào `UserInfo` |
| `src/common/dto/param.dto.ts` | đổi `z.string().uuid()` → ObjectId (mục 6.4) |
| `src/common/envs/validate.env.ts` | thêm biến môi trường mới và **bật lại `validate`** trong `ConfigModule` |
| `src/common/interceptors/**` | giữ nguyên |
| `src/common/middlewares/**`, `src/common/pipes/**` | giữ nguyên |
| `src/common/security/rate-limit/**` | giữ nguyên |
| `src/common/utils/` gồm `pagination-util`, `string-util`, `date-util`, `file-util`, `excel-util`, `cache-util`, `api-util` | giữ nguyên |
| `src/common/utils/query-util` | mang sang, nhưng search sản phẩm dùng filter builder riêng (mục 8) |
| `src/app/auth/**` | **sửa lỗi** (mục 5) |

### 2.2 Không mang sang / viết lại

| Bỏ | Lý do / thay bằng |
|---|---|
| `prisma/migrations/`, `schema.prod.prisma` | MongoDB không dùng migrate, chỉ cần 1 schema |
| `src/common/prisma/prisma.service.ts` | **viết lại** (mục 6.1) |
| `src/common/guards/access-control/**` | thay bằng `AdminGuard` (mục 5.2) |
| Module Vendor, UserVendorRole, Role, Permission, RolePermission | một cửa hàng chỉ cần `User.role` (enum) |
| Toàn bộ module CRUD chung (cart-items, order-items, order-addresses…) | gom vào module nghiệp vụ (mục 4) |
| `knowledge/`, `*.session.sql` | không cần |

### 2.3 Sửa CORS trong `init.ts`

Cũ: `origin: FE_URL ? FE_URL : ['*']`. Khi xác thực bằng cookie thì phải chỉ định origin cụ thể và bật `credentials`:

```ts
app.enableCors({
  origin: FE_URL?.split(',') ?? 'http://localhost:3000',
  credentials: true,
});
```

Trong `removeFieldsAndRelations` có hard-code tên field `userID`. Nếu bạn đổi quy ước đặt tên thì nhớ sửa chỗ này. Plan này **giữ quy ước `xxxID`** để khớp với code cũ.

### 2.4 `.env`

```env
PORT=8888
APP_PREFIX=/api
APP_NAME=home_decor
NODE_ENV=development
FE_URL=http://localhost:3000

DATABASE_URL="mongodb+srv://..."

JWT_SECRET=...
JWT_REFRESH_SECRET=...          # tách riêng với access token

CLOUDINARY_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

MAIL_HOST=
MAIL_PORT=
MAIL_USER=
MAIL_PASS=

VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/payment/result

MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create

ORDER_UNPAID_TIMEOUT_MINUTES=30
```

### 2.5 Dependencies

Copy các dependency từ `package.json` cũ, **bỏ** `prisma-generator-fake-data` và `prisma-json-types-generator`, rồi **thêm**:

```bash
npm i @nestjs/schedule ms nodemailer dayjs
npm i -D @types/nodemailer @types/ms
```

> Project cũ có dùng `ms` trong `auth.controller.ts` nhưng không khai báo trong `package.json` (nó đang nằm đó nhờ là dependency của gói khác). Nên khai báo rõ.

### 2.6 Scripts

```json
"prisma:generate": "prisma generate",
"db:push": "prisma db push",
"db:reset": "prisma db push --force-reset",
"db:seed": "ts-node prisma/seed.ts",
"db:studio": "prisma studio"
```

> `db push` tạo collection và index (`@unique`, `@@index`). **Mỗi lần sửa schema đều phải chạy lại** `db:push` và `prisma:generate`.

---

## 3. Prisma schema (MongoDB)

File `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider          = "zod-prisma-types"
  output            = "../src/generated/zod"
  useTypeAssertions = true
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// ───────────── ENUMS ─────────────

enum Role {
  admin
  customer
}

enum UserStatus {
  active
  inactive
}

enum ProductStatus {
  draft
  active
  inactive
}

enum OrderStatus {
  pending      // vừa đặt, chờ xác nhận / chờ thanh toán
  confirmed    // shop đã xác nhận (hoặc đã thanh toán online)
  processing   // đang chuẩn bị / đang sản xuất (hàng đặt làm)
  shipping     // đang giao
  delivered    // đã giao
  cancelled
  returned
}

enum PaymentMethod {
  cod
  vnpay
  momo
  bank_transfer
}

enum PaymentStatus {
  pending
  paid
  failed
  refunded
}

enum PromotionType {
  percentage
  fixed_amount
  free_shipping
}

enum ReviewStatus {
  pending
  approved
  hidden
}

// ───────────── EMBEDDED TYPES ─────────────

type Dimensions {
  lengthCm Float
  widthCm  Float
  heightCm Float
}

type ImageItem {
  url       String
  publicID  String?   // Cloudinary public_id, để xóa ảnh
  alt       String?
  sortOrder Int
}

type VariantOption {
  name  String   // "Màu", "Kích thước", "Chất liệu"
  value String   // "Xám", "3 chỗ", "Gỗ sồi"
}

type CartItem {
  variantID String   @db.ObjectId
  quantity  Int
  addedAt   DateTime
}

type OrderItem {
  productID   String  @db.ObjectId
  variantID   String  @db.ObjectId
  name        String
  variantName String?
  sku         String
  imageUrl    String?
  unitPrice   Int
  quantity    Int
  lineTotal   Int
  assemblyFee Int     // phí lắp đặt cho dòng này (0 nếu không lắp)
}

type ShippingAddress {
  fullName String
  phone    String
  province String
  district String
  ward     String
  street   String
}

type OrderStatusLog {
  status OrderStatus
  note   String?
  changedBy String? // email người thao tác hoặc "system". KHÔNG đặt tên `by`: zod-prisma-types crash
  at     DateTime
}

// ───────────── MODELS ─────────────

model User {
  id                 String     @id @default(auto()) @map("_id") @db.ObjectId
  email              String     @unique
  password           String
  fullName           String
  phone              String?
  avatarUrl          String?
  role               Role       @default(customer)
  status             UserStatus @default(active)
  wishlistProductIDs String[]   @db.ObjectId
  resetPasswordToken String?    // lưu dạng hash
  resetPasswordExp   DateTime?
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt
  deletedAt          DateTime?

  addresses Address[]
  cart      Cart?
  orders    Order[]
  reviews   Review[]
}

model Address {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userID    String   @db.ObjectId
  fullName  String
  phone     String
  province  String
  district  String
  ward      String
  street    String
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userID], references: [id])

  @@index([userID])
}

model Category {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  slug        String    @unique
  description String?
  imageUrl    String?
  parentID    String?   @db.ObjectId
  sortOrder   Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  // MongoDB: quan hệ tự trỏ bắt buộc NoAction
  parent   Category?  @relation("CategoryTree", fields: [parentID], references: [id], onDelete: NoAction, onUpdate: NoAction)
  children Category[] @relation("CategoryTree")
  products Product[]

  @@index([parentID])
}

model Product {
  id               String        @id @default(auto()) @map("_id") @db.ObjectId
  name             String
  slug             String        @unique
  shortDescription String?
  description      String?       // HTML / markdown
  categoryID       String        @db.ObjectId
  images           ImageItem[]

  // Các field để lọc. Giá trị lấy từ hằng số (mục 3.2)
  rooms            String[]      // "living-room", "bedroom"...
  styles           String[]      // "scandinavian", "japandi"...
  materials        String[]      // "oak", "rattan"...
  colors           String[]      // tổng hợp từ các variant
  tags             String[]

  // Giá hiển thị: tính lại mỗi khi sửa variant
  minPrice         Int           @default(0)
  maxPrice         Int           @default(0)

  requiresAssembly Boolean       @default(false)
  assemblyFee      Int           @default(0)   // VND / sản phẩm
  allowBackorder   Boolean       @default(false) // hàng đặt làm: cho đặt khi hết kho
  leadTimeDays     Int           @default(0)     // thời gian sản xuất nếu đặt làm
  warrantyMonths   Int           @default(0)

  isFeatured       Boolean       @default(false)
  status           ProductStatus @default(draft)
  ratingAvg        Float         @default(0)
  ratingCount      Int           @default(0)
  soldCount        Int           @default(0)

  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  deletedAt        DateTime?

  category Category         @relation(fields: [categoryID], references: [id])
  variants ProductVariant[]
  reviews  Review[]

  @@index([categoryID])
  @@index([status, isFeatured])
}

/// Mọi sản phẩm có ít nhất 1 variant (variant mặc định), nên giỏ hàng và đơn hàng luôn trỏ tới variant.
model ProductVariant {
  id             String          @id @default(auto()) @map("_id") @db.ObjectId
  productID      String          @db.ObjectId
  sku            String          @unique   // BẮT BUỘC (xem lưu ý mục 9)
  name           String                     // "Sofa 3 chỗ - Xám"
  options        VariantOption[]
  price          Int
  compareAtPrice Int?                       // giá gạch ngang
  stock          Int             @default(0)
  dimensions     Dimensions?
  weightKg       Float           @default(0)
  images         ImageItem[]
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  deletedAt      DateTime?

  product Product @relation(fields: [productID], references: [id])

  @@index([productID])
}

model Cart {
  id        String     @id @default(auto()) @map("_id") @db.ObjectId
  userID    String     @unique @db.ObjectId
  items     CartItem[]
  updatedAt DateTime   @updatedAt

  user User @relation(fields: [userID], references: [id])
}

model Order {
  id              String           @id @default(auto()) @map("_id") @db.ObjectId
  orderNumber     String           @unique
  userID          String           @db.ObjectId
  items           OrderItem[]
  shippingAddress ShippingAddress
  note            String?

  subtotal        Int
  shippingFee     Int              @default(0)
  assemblyFee     Int              @default(0)
  discount        Int              @default(0)
  total           Int
  promotionCode   String?
  promotionID     String?          @db.ObjectId

  paymentMethod   PaymentMethod
  paymentStatus   PaymentStatus    @default(pending)
  status          OrderStatus      @default(pending)
  statusHistory   OrderStatusLog[]
  cancelReason    String?

  expectedDeliveryAt DateTime?
  paidAt          DateTime?
  shippedAt       DateTime?
  deliveredAt     DateTime?
  cancelledAt     DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  user     User      @relation(fields: [userID], references: [id])
  payments Payment[]

  @@index([userID, createdAt])
  @@index([status, createdAt])
}

model Payment {
  id            String        @id @default(auto()) @map("_id") @db.ObjectId
  orderID       String        @db.ObjectId
  method        PaymentMethod
  amount        Int
  status        PaymentStatus @default(pending)
  transactionID String?       // mã giao dịch từ cổng thanh toán
  rawResponse   Json?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  order Order @relation(fields: [orderID], references: [id])

  @@index([orderID])
  @@index([transactionID])     // KHÔNG dùng @unique vì field optional
}

model Promotion {
  id            String        @id @default(auto()) @map("_id") @db.ObjectId
  code          String        @unique
  name          String
  description   String?
  type          PromotionType
  value         Int           // % (1–100) hoặc số tiền VND
  maxDiscount   Int?          // trần giảm cho loại percentage
  minOrderValue Int           @default(0)
  usageLimit    Int?          // tổng lượt dùng
  usedCount     Int           @default(0)
  perUserLimit  Int?
  startsAt      DateTime
  endsAt        DateTime?
  isActive      Boolean       @default(true)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  deletedAt     DateTime?
}

model Review {
  id        String       @id @default(auto()) @map("_id") @db.ObjectId
  productID String       @db.ObjectId
  userID    String       @db.ObjectId
  orderID   String       @db.ObjectId
  rating    Int          // 1–5
  comment   String?
  images    ImageItem[]
  status    ReviewStatus @default(approved)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  product Product @relation(fields: [productID], references: [id])
  user    User    @relation(fields: [userID], references: [id])

  @@unique([userID, productID, orderID])
  @@index([productID, status])
}

model ShippingZone {
  id                String   @id @default(auto()) @map("_id") @db.ObjectId
  name              String            // "Nội thành HCM", "Miền Bắc"...
  provinces         String[]          // danh sách tỉnh thuộc vùng
  baseFee           Int               // phí cho khối lượng đầu
  baseWeightKg      Float             // vd 5kg
  feePerKg          Int               // phí mỗi kg tiếp theo
  bulkySurcharge    Int      @default(0)  // phụ phí hàng cồng kềnh
  freeShipThreshold Int?              // đơn >= giá trị này thì free ship (trừ hàng cồng kềnh)
  estimatedDays     Int
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### 3.1 Vì sao thiết kế như vậy

| Quyết định | Lý do |
|---|---|
| Tiền lưu bằng `Int` | Prisma + MongoDB **không hỗ trợ `Decimal`**; VND không có số lẻ |
| `items` nhúng trong `Cart` và `Order` | Đọc 1 document là có đủ thông tin; đơn hàng là snapshot, không cần join |
| Mỗi product có **một** `categoryID` + các mảng `rooms` / `styles` | Tránh quan hệ nhiều-nhiều (trên MongoDB, Prisma bắt cả hai phía phải giữ mảng ID). Room/style lọc bằng mảng là đủ |
| `wishlistProductIDs` là mảng trên User | Wishlist nhỏ, không cần collection riêng |
| `Address` là model riêng | Cần id ổn định để sửa/xóa; type nhúng không tự sinh id |
| `dimensions`, `weightKg` đặt trên variant | Sofa 2 chỗ và 3 chỗ có kích thước, cân nặng khác nhau nên phí ship khác nhau |
| `minPrice`, `maxPrice`, `colors` lưu thừa trên Product | Lọc và sắp xếp theo giá ở trang danh sách mà không phải join variant |

### 3.2 Hằng số cho các field lọc

`src/common/constants/catalog.const.ts`. Dùng trong Zod (`z.enum`) để dữ liệu nhập vào luôn đồng nhất:

```ts
export const ROOMS = ['living-room', 'bedroom', 'dining-room', 'kitchen', 'office', 'bathroom', 'outdoor', 'kids'] as const;
export const STYLES = ['scandinavian', 'japandi', 'indochine', 'minimalist', 'industrial', 'vintage', 'modern', 'boho'] as const;
export const MATERIALS = ['oak', 'walnut', 'ash', 'rattan', 'bamboo', 'ceramic', 'metal', 'glass', 'fabric', 'leather', 'marble', 'linen'] as const;
```

---

## 4. Cấu trúc thư mục

```
home_decor_api/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ src/
│  ├─ main.ts
│  ├─ init.ts
│  ├─ app.module.ts
│  ├─ catch-everything/          (copy + sửa)
│  ├─ logger/                    (copy)
│  ├─ common/                    (copy + sửa)
│  │  ├─ constants/catalog.const.ts
│  │  ├─ decorators/  (user, cookie, public.decorator.ts, admin-only.decorator.ts)
│  │  ├─ guards/      (auth.guard.ts, admin.guard.ts)
│  │  ├─ prisma/      (prisma.module.ts, prisma.service.ts ← viết lại)
│  │  └─ ...
│  └─ app/                       # giống project cũ: mỗi collection một module
│     ├─ auth/                   # sign-up/in, token, quên/đổi mật khẩu
│     ├─ users/                  # /me, /me/wishlist, /admin/users
│     ├─ addresses/              # /me/addresses
│     ├─ categories/             # public + /admin/categories
│     ├─ products/               # public + /admin/products, import/export Excel
│     ├─ product-variants/       # /admin/products/:id/variants, /admin/variants/:id/stock
│     ├─ product-images/         # upload/xóa ảnh Cloudinary (ảnh nhúng trong product/variant)
│     ├─ carts/                  # /me/cart (items nhúng trong Cart)
│     ├─ shipping-zones/         # /admin/shipping-zones + hàm tính phí ship
│     ├─ promotions/             # /admin/promotions + validate/tính tiền giảm
│     ├─ checkout/               # preview + đặt hàng (transaction), không có collection riêng
│     ├─ orders/                 # /me/orders, /admin/orders, cron hủy đơn (items, địa chỉ nhúng trong Order)
│     ├─ payments/               # vnpay, momo, ipn
│     ├─ reviews/                # /products/:id/reviews, /reviews/:id, /admin/reviews
│     └─ dashboard/              # /admin/dashboard, không có collection riêng
└─ .env
```

**Quy tắc chia module:** mỗi collection (model trong `schema.prisma`) là một module. Dữ liệu nhúng (`CartItem`, `OrderItem`, `ShippingAddress`, `ImageItem`...) **không** có module riêng, mà nằm trong module của document cha. Chỉ những luồng dùng nhiều collection (`auth`, `checkout`, `dashboard`) mới là module không gắn với collection nào.

Module cũ **không mang sang**: `cart-items`, `order-items`, `order-addresses`, `order-promotions` (đã nhúng), `product-categories` (mỗi product một `categoryID`), `vendors`, `user-vendor-roles`, `roles`, `permissions`, `role-permissions` (thay bằng `User.role`).

Mỗi module tách 2 controller: `xxx.controller.ts` (public/customer) và `admin-xxx.controller.ts` (gắn `@AdminOnly()` ở cấp class), dùng chung một service. Module nào chỉ có phía admin (`shipping-zones`, `dashboard`) thì chỉ cần `admin-xxx.controller.ts`.

Gọi chéo giữa các module qua service được `export` (vd `checkout` inject `CartsService`, `ShippingZonesService`, `PromotionsService`), không truy vấn thẳng collection của module khác.

---

## 5. Auth và phân quyền

### 5.1 Lỗi trong auth cũ cần sửa khi mang sang

| Lỗi | File cũ | Sửa |
|---|---|---|
| `verifyToken` gặp token sai chữ ký thì **trả `undefined`** thay vì ném lỗi. Sau đó `refreshToken()` destructure `undefined` và trả về 500 | `auth.service.ts:39-47` | Mọi lỗi đều `throw new UnauthorizedException()` |
| Access token và refresh token **dùng chung secret và payload**, nên access token dùng thay refresh token được (và ngược lại) | `auth.service.ts:25-37` | Dùng `JWT_REFRESH_SECRET` riêng và thêm claim `type: 'access' \| 'refresh'` |
| `forgot-password` **không có `@SkipAuth()`**, nên người quên mật khẩu phải đăng nhập mới gọi được | `auth.controller.ts:80` | Thêm `@Public()` |
| `reset-password` lấy user từ token đăng nhập, **không có token reset**. Thực chất là đổi mật khẩu mà không hỏi mật khẩu cũ | `auth.controller.ts:85-91` | Tách làm 2: `reset-password` (public, nhận token gửi qua email) và `change-password` (đăng nhập, bắt nhập mật khẩu cũ) |
| `resetPassword` truyền `user` vào `data` của `update`, nên Prisma báo lỗi unknown field | `auth.service.ts:115-121` | Chỉ truyền `{ password }` |
| Payload không có `role` | `auth.service.ts:74-75` | Payload: `{ userID, userEmail, role }` |
| Đăng nhập không kiểm tra `status` | `auth.service.ts:64` | User `inactive` thì trả 403 |
| `logout` là GET | `auth.controller.ts:47` | Đổi sang POST |

### 5.2 AdminGuard (thay `AccessControlGuard`)

Chỉ có 2 vai trò `admin` và `customer`, nên không cần bảng Role/Permission hay `@Roles(...)` tổng quát. Một decorator `@AdminOnly()` là đủ:

```ts
// common/decorators/admin-only.decorator.ts
export const IS_ADMIN_ONLY = 'isAdminOnly';
export const AdminOnly = () => SetMetadata(IS_ADMIN_ONLY, true);

// common/guards/admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const adminOnly = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_ONLY, [ctx.getHandler(), ctx.getClass()]);
    if (!adminOnly) return true;                     // không gắn @AdminOnly: chỉ cần đăng nhập (hoặc @Public)
    const user = ctx.switchToHttp().getRequest().user as UserInfo | undefined;
    if (user?.role !== Role.admin) throw new ForbiddenException();
    return true;
  }
}
```

Thứ tự đăng ký global guard: `ThrottlerGuard`, rồi `AuthGuard`, rồi `AdminGuard`.

**Quyền theo vai trò:**

| | Khách (chưa đăng nhập) | customer | admin |
|---|---|---|---|
| Xem sản phẩm, danh mục, review | ✔ | ✔ | ✔ |
| Giỏ hàng, đặt hàng, đơn của mình, wishlist, review | | ✔ | ✔ |
| Toàn bộ `/admin/...`: sản phẩm, tồn kho, đơn hàng, khuyến mãi, phí ship, review, user, dashboard | | | ✔ |

> Đăng ký (`sign-up`) luôn tạo `role = customer`. Tài khoản admin chỉ tạo qua seed, qua `POST /admin/users`, hoặc do admin khác đổi role trong `PATCH /admin/users/:id`.
>
> Admin **không được** tự hạ role, tự khóa (`inactive`) hay tự xóa chính mình, để tránh hệ thống không còn admin nào.

**Quyền sở hữu:** mọi route `/me/...` đều lọc theo `userID` lấy từ token, **không bao giờ** lấy từ body hay param. Ví dụ: `findFirst({ where: { orderNumber, userID: user.userID } })`.

> Role nằm trong JWT nên đổi role chỉ có hiệu lực từ lần refresh token sau. Nếu cần thu hồi quyền admin ngay, đọc role từ DB trong `AdminGuard`.

---

## 6. Hạ tầng cần viết lại hoặc sửa

### 6.1 `prisma.service.ts` (viết lại)

Những lỗi của bản cũ cần tránh:
- Gắn `deletedAt: null` cho **mọi** model, kể cả model không có field này, nên Prisma báo lỗi.
- Ép `orderBy: updatedAt` cho mọi `findMany` và **ghi đè** cách sắp xếp do service truyền vào.
- Tự thêm `createdBy` vào mọi lệnh `create`, nên sẽ lỗi với model không có field đó.
- Với MongoDB, `deletedAt: null` **không khớp** các document chưa từng có field `deletedAt`.

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export const SOFT_DELETE_MODELS: string[] = ['User', 'Category', 'Product', 'ProductVariant', 'Promotion'];

// MongoDB: field có thể là null HOẶC chưa tồn tại
export const NOT_DELETED = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };

const withNotDeleted = (model: string, where: any = {}) => {
  if (!SOFT_DELETE_MODELS.includes(model)) return where;
  const and = where.AND ? [].concat(where.AND) : [];
  return { ...where, AND: [...and, NOT_DELETED] };
};

const extend = (client: PrismaClient) =>
  client.$extends({
    query: {
      $allModels: {
        findUnique:        ({ model, args, query }) => query({ ...args, where: withNotDeleted(model, args.where) }),
        findUniqueOrThrow: ({ model, args, query }) => query({ ...args, where: withNotDeleted(model, args.where) }),
        findFirst:         ({ model, args, query }) => query({ ...args, where: withNotDeleted(model, args.where) }),
        findFirstOrThrow:  ({ model, args, query }) => query({ ...args, where: withNotDeleted(model, args.where) }),
        findMany:          ({ model, args, query }) => query({ ...args, where: withNotDeleted(model, args.where) }),
        count:             ({ model, args, query }) => query({ ...args, where: withNotDeleted(model, args.where) }),
      },
    },
    model: {
      $allModels: {
        async softDelete<T>(this: T, where: Prisma.Args<T, 'updateMany'>['where']) {
          const ctx: any = Prisma.getExtensionContext(this);
          return ctx.updateMany({ where, data: { deletedAt: new Date() } });
        },
        async restore<T>(this: T, where: Prisma.Args<T, 'updateMany'>['where']) {
          const ctx: any = Prisma.getExtensionContext(this);
          return ctx.updateMany({ where, data: { deletedAt: null } });
        },
      },
    },
  });

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  readonly extended = extend(this);   // service dùng this.prisma.extended.product.findMany(...)

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

> **Lưu ý:** client bên trong `$transaction(async (tx) => ...)` là client gốc, **không có** filter soft delete. Trong transaction phải tự thêm `...NOT_DELETED` vào `where`.
> Dữ liệu đầu ra không còn `Decimal`, nên bỏ luôn `convertData`.

### 6.2 Không dùng DTO sinh tự động cho dữ liệu client gửi lên

Project cũ dùng `createZodDto(OrderCreateInputSchema)`, nên client gửi được **mọi field** (`total`, `status`, `role`...). Project mới viết DTO riêng cho từng endpoint:

```ts
export class CheckoutDto extends createZodDto(z.object({
  addressID: objectId,
  paymentMethod: z.nativeEnum(PaymentMethod),
  promotionCode: z.string().trim().toUpperCase().optional(),
  withAssembly: z.boolean().default(false),
  note: z.string().max(500).optional(),
})) {}
```

Schema sinh tự động (`src/generated/zod`) chỉ dùng cho response, hoặc dùng làm gốc rồi `.pick()` những field cần.

### 6.3 Map lỗi Prisma trong `CatchEverythingFilter`

Bản cũ trả 500 cho mọi lỗi Prisma. Thêm đoạn sau:

```ts
if (exception instanceof Prisma.PrismaClientKnownRequestError) {
  const map: Record<string, number> = {
    P2002: HttpStatus.CONFLICT,      // trùng unique (email, slug, sku, code)
    P2025: HttpStatus.NOT_FOUND,     // không tìm thấy bản ghi để update/delete
    P2023: HttpStatus.BAD_REQUEST,   // ObjectId sai định dạng
    P2034: HttpStatus.CONFLICT,      // xung đột transaction (đã retry hết lượt)
  };
  exceptionValue.status = map[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
}
```

### 6.4 `param.dto.ts`

```ts
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
export class IDDto extends createZodDto(z.object({ id: objectId })) {}
```

---

## 7. Danh sách API

Prefix `/api`. **Public** = không cần đăng nhập · **U** = đã đăng nhập (customer hoặc admin) · **A** = chỉ admin.

### Auth
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/auth/sign-up` | Public | Đăng ký (role luôn là `customer`) |
| POST | `/auth/sign-in` | Public | Trả token + set cookie |
| POST | `/auth/refresh-token` | Public | Đọc refresh token từ cookie |
| POST | `/auth/logout` | Public | Xóa cookie |
| POST | `/auth/forgot-password` | Public | Gửi email kèm link reset (token hết hạn sau 15 phút) |
| POST | `/auth/reset-password` | Public | `{ token, newPassword }` |
| PATCH | `/auth/change-password` | U | `{ oldPassword, newPassword }` |

### Tài khoản của tôi
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/me` | U | Thông tin user |
| PATCH | `/me` | U | Sửa `fullName`, `phone`, `avatarUrl` |
| GET | `/me/addresses` | U | |
| POST | `/me/addresses` | U | Địa chỉ đầu tiên tự động là mặc định |
| PATCH | `/me/addresses/:id` | U | |
| DELETE | `/me/addresses/:id` | U | |
| PATCH | `/me/addresses/:id/default` | U | Bỏ mặc định ở các địa chỉ khác |
| GET | `/me/wishlist` | U | Danh sách sản phẩm |
| POST | `/me/wishlist/:productID` | U | `push` vào mảng (bỏ qua nếu đã có) |
| DELETE | `/me/wishlist/:productID` | U | |

### Catalog (public)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/categories` | Cây danh mục (chỉ lấy `isActive`) |
| GET | `/categories/:slug` | Chi tiết + breadcrumb |
| GET | `/products` | Lọc và phân trang (mục 8) |
| GET | `/products/featured` | Sản phẩm nổi bật |
| GET | `/products/filters` | Các giá trị lọc khả dụng: rooms, styles, materials, colors, khoảng giá |
| GET | `/products/:slug` | Chi tiết, gồm variants và ảnh |
| GET | `/products/:slug/related` | Cùng danh mục hoặc cùng style |
| GET | `/products/:id/reviews` | Review đã duyệt, phân trang, kèm thống kê số sao |

### Giỏ hàng (U)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/me/cart` | Items kèm **giá và tồn kho hiện tại**, đánh dấu item hết hàng / ngừng bán |
| POST | `/me/cart/items` | `{ variantID, quantity }`, cộng dồn nếu đã có trong giỏ |
| PATCH | `/me/cart/items/:variantID` | `{ quantity }` |
| DELETE | `/me/cart/items/:variantID` | |
| DELETE | `/me/cart` | Xóa toàn bộ giỏ |

### Checkout và đơn hàng (U)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/checkout/preview` | `{ addressID, promotionCode?, withAssembly? }`, trả bảng tính tiền, **không ghi DB** |
| POST | `/checkout` | Tạo đơn (mục 10). Thanh toán online thì trả kèm `paymentUrl` |
| GET | `/me/orders` | Lọc theo status, phân trang |
| GET | `/me/orders/:orderNumber` | Chi tiết + lịch sử trạng thái |
| POST | `/me/orders/:orderNumber/cancel` | Chỉ hủy được khi `pending` |
| POST | `/me/orders/:orderNumber/pay` | Tạo lại link thanh toán cho đơn chưa trả tiền |

### Thanh toán
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/payments/vnpay/return` | Public | VNPay redirect về; chỉ để hiển thị, **không** cập nhật đơn ở đây |
| GET | `/payments/vnpay/ipn` | Public | VNPay gọi server-to-server; kiểm tra chữ ký rồi cập nhật đơn |
| POST | `/payments/momo/ipn` | Public | Tương tự cho MoMo |

### Review
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/products/:id/reviews` | U | Chỉ khi có đơn `delivered` chứa sản phẩm này; mỗi đơn 1 review |
| PATCH | `/reviews/:id` | U (chủ review) | |
| DELETE | `/reviews/:id` | U (chủ review) | |

### Admin (`/admin/...`)
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| CRUD | `/admin/categories` | A | Tự sinh slug từ name |
| CRUD | `/admin/products` | A | Tạo product kèm ít nhất 1 variant |
| POST | `/admin/products/:id/images` | A | Upload Cloudinary (multipart) |
| DELETE | `/admin/products/:id/images/:publicID` | A | |
| CRUD | `/admin/products/:id/variants` | A | Sau mỗi thay đổi, tính lại `minPrice`, `maxPrice`, `colors` của product |
| PATCH | `/admin/variants/:id/stock` | A | `{ stock }` hoặc `{ adjust: +n/-n }` |
| POST | `/admin/products/import` | A | Excel (dùng lại excel-util) |
| POST | `/admin/products/export` | A | |
| GET | `/admin/orders` | A | Lọc theo status, khoảng ngày, mã đơn, email, phương thức thanh toán |
| GET | `/admin/orders/:id` | A | |
| PATCH | `/admin/orders/:id/status` | A | Kiểm tra bước chuyển trạng thái hợp lệ (mục 11) |
| POST | `/admin/orders/export` | A | Excel |
| GET / PATCH | `/admin/reviews`, `/admin/reviews/:id/status` | A | Ẩn hoặc duyệt review |
| CRUD | `/admin/promotions` | A | |
| CRUD | `/admin/shipping-zones` | A | |
| GET | `/admin/users` | A | Lọc theo `role`, `status`, tìm theo email / tên / SĐT, phân trang |
| GET | `/admin/users/:id` | A | Chi tiết + số đơn, tổng chi tiêu, địa chỉ |
| POST | `/admin/users` | A | Tạo tài khoản (được chọn `role`, kể cả admin) |
| PATCH | `/admin/users/:id` | A | Sửa `fullName`, `phone`, `role`, `status`. **Không** sửa mật khẩu ở đây |
| DELETE | `/admin/users/:id` | A | Soft delete. Không xóa cứng vì đơn hàng còn trỏ tới user |
| GET | `/admin/dashboard` | A | Doanh thu theo ngày, số đơn theo trạng thái, top sản phẩm, hàng sắp hết |

---

## 8. Lọc sản phẩm

`GET /products?category=sofa&room=living-room&style=japandi&material=oak,rattan&color=beige&minPrice=1000000&maxPrice=20000000&inStock=true&q=sofa&sort=price_asc&page=1&itemPerPage=20`

```ts
const where: Prisma.ProductWhereInput = { status: 'active' };
if (categoryIDs.length) where.categoryID = { in: categoryIDs }; // gồm cả danh mục con
if (room)      where.rooms     = { has: room };
if (style)     where.styles    = { has: style };
if (materials) where.materials = { hasSome: materials };
if (color)     where.colors    = { has: color };
if (minPrice || maxPrice) where.minPrice = { gte: minPrice ?? 0, lte: maxPrice ?? Number.MAX_SAFE_INTEGER };
if (q)         where.name      = { contains: q, mode: 'insensitive' };
if (inStock)   where.variants  = { some: { stock: { gt: 0 }, isActive: true } };

const orderBy = {
  newest: { createdAt: 'desc' },
  price_asc: { minPrice: 'asc' },
  price_desc: { minPrice: 'desc' },
  best_selling: { soldCount: 'desc' },
  rating: { ratingAvg: 'desc' },
}[sort ?? 'newest'];

const [items, total] = await Promise.all([
  this.prisma.extended.product.findMany({ where, orderBy, skip, take, select: listSelect }),
  this.prisma.extended.product.count({ where }),        // count PHẢI dùng cùng where
]);
```

> Prisma **không hỗ trợ full-text search trên MongoDB**. `contains` + `insensitive` (regex) đủ dùng cho vài nghìn sản phẩm. Nếu cần tìm kiếm tiếng Việt không dấu, thêm field `searchText` (tên đã bỏ dấu, viết thường) và search trên field đó. Khi catalog lớn thì chuyển sang Atlas Search qua `aggregateRaw`.

---

## 9. Phí vận chuyển

```ts
// Trọng lượng quy đổi (cm³ / 5000), phổ biến với hàng cồng kềnh
const volumetricKg = (d?: Dimensions) => d ? (d.lengthCm * d.widthCm * d.heightCm) / 5000 : 0;

calculate(zone: ShippingZone, lines: { variant: ProductVariant; quantity: number }[], subtotal: number) {
  let totalKg = 0;
  let isBulky = false;
  for (const { variant, quantity } of lines) {
    const kg = Math.max(variant.weightKg, volumetricKg(variant.dimensions));
    totalKg += kg * quantity;
    const longest = Math.max(variant.dimensions?.lengthCm ?? 0, variant.dimensions?.widthCm ?? 0, variant.dimensions?.heightCm ?? 0);
    if (kg >= 30 || longest >= 150) isBulky = true;
  }
  if (!isBulky && zone.freeShipThreshold && subtotal >= zone.freeShipThreshold) return 0;
  const extraKg = Math.max(0, Math.ceil(totalKg - zone.baseWeightKg));
  return zone.baseFee + extraKg * zone.feePerKg + (isBulky ? zone.bulkySurcharge : 0);
}
```

Tìm vùng giao hàng: `shippingZone.findFirst({ where: { isActive: true, provinces: { has: address.province } } })`. Không tìm thấy thì báo lỗi "Chưa hỗ trợ giao tới khu vực này".

---

## 10. Checkout (quan trọng nhất)

```ts
async checkout(user: UserInfo, dto: CheckoutDto) {
  const order = await this.withRetry(() =>
    this.prisma.$transaction(async (tx) => {
      // 1. Giỏ hàng
      const cart = await tx.cart.findUnique({ where: { userID: user.userID } });
      if (!cart?.items.length) throw new BadRequestException('Giỏ hàng trống');

      // 2. Lấy variant + product từ DB (KHÔNG tin giá từ client)
      const variants = await tx.productVariant.findMany({
        where: { id: { in: cart.items.map((i) => i.variantID) }, isActive: true, ...NOT_DELETED },
        include: { product: true },
      });

      // 3. Địa chỉ của chính user
      const address = await tx.address.findFirst({ where: { id: dto.addressID, userID: user.userID } });
      if (!address) throw new NotFoundException('Không tìm thấy địa chỉ');

      // 4. Dựng các dòng của đơn + kiểm tra
      const lines = cart.items.map((ci) => {
        const v = variants.find((x) => x.id === ci.variantID);
        if (!v || v.product.status !== 'active') throw new BadRequestException('Có sản phẩm đã ngừng bán');
        if (!v.product.allowBackorder && v.stock < ci.quantity)
          throw new ConflictException(`${v.name} chỉ còn ${v.stock}`);
        const assembly = dto.withAssembly && v.product.requiresAssembly ? v.product.assemblyFee * ci.quantity : 0;
        return { variant: v, quantity: ci.quantity, assembly };
      });

      // 5. Tính tiền ở server
      const subtotal = sum(lines.map((l) => l.variant.price * l.quantity));
      const assemblyFee = sum(lines.map((l) => l.assembly));
      const zone = await this.shippingService.findZone(tx, address.province);
      let shippingFee = this.shippingService.calculate(zone, lines, subtotal);
      const promo = dto.promotionCode
        ? await this.promotionsService.validate(tx, { code: dto.promotionCode, userID: user.userID, subtotal })
        : null;
      const discount = promo ? this.promotionsService.computeDiscount(promo, subtotal, shippingFee) : 0;
      if (promo?.type === 'free_shipping') shippingFee = 0;
      const total = subtotal + shippingFee + assemblyFee - (promo?.type === 'free_shipping' ? 0 : discount);

      // 6. Trừ kho ATOMIC: chỉ trừ khi còn đủ hàng
      for (const l of lines) {
        if (l.variant.product.allowBackorder) continue;
        const r = await tx.productVariant.updateMany({
          where: { id: l.variant.id, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (r.count === 0) throw new ConflictException(`${l.variant.name} không đủ hàng`);
      }

      // 7. Tăng lượt dùng mã giảm giá ATOMIC
      if (promo) {
        const r = await tx.promotion.updateMany({
          where: { id: promo.id, ...(promo.usageLimit ? { usedCount: { lt: promo.usageLimit } } : {}) },
          data: { usedCount: { increment: 1 } },
        });
        if (r.count === 0) throw new ConflictException('Mã giảm giá đã hết lượt');
      }

      // 8. Tạo đơn (snapshot toàn bộ)
      const created = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(), // "HD251112-7K3M9Q": ngày + 6 ký tự ngẫu nhiên
          userID: user.userID,
          items: lines.map((l) => ({
            productID: l.variant.productID,
            variantID: l.variant.id,
            name: l.variant.product.name,
            variantName: l.variant.name,
            sku: l.variant.sku,
            imageUrl: l.variant.images[0]?.url ?? l.variant.product.images[0]?.url,
            unitPrice: l.variant.price,
            quantity: l.quantity,
            lineTotal: l.variant.price * l.quantity,
            assemblyFee: l.assembly,
          })),
          shippingAddress: pick(address, ['fullName', 'phone', 'province', 'district', 'ward', 'street']),
          note: dto.note,
          subtotal, shippingFee, assemblyFee, discount, total,
          promotionCode: promo?.code, promotionID: promo?.id,
          paymentMethod: dto.paymentMethod,
          statusHistory: [{ status: 'pending', changedBy: user.userEmail, at: new Date() }],
          expectedDeliveryAt: this.estimateDelivery(zone, lines),  // tính cả leadTimeDays của hàng đặt làm
        },
      });

      // 9. Xóa giỏ hàng
      await tx.cart.update({ where: { userID: user.userID }, data: { items: { set: [] } } });
      return created;
    }),
  );

  // 10. Ngoài transaction: tạo link thanh toán, gửi email
  const paymentUrl = order.paymentMethod === 'vnpay' ? await this.vnpay.createUrl(order)
                   : order.paymentMethod === 'momo'  ? await this.momo.createUrl(order) : null;
  this.mailService.sendOrderConfirmation(order).catch(() => {}); // không chặn response
  return { order, paymentUrl };
}

// MongoDB có thể báo write conflict khi 2 đơn cùng trừ kho 1 variant: retry
private async withRetry<T>(fn: () => Promise<T>, times = 3): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034' && i < times - 1) continue;
      throw e;
    }
  }
}
```

**Kiểm tra mã giảm giá** (`promotionsService.validate`): `isActive`, chưa bị xóa, `startsAt <= now`, `endsAt` null hoặc `>= now`, `subtotal >= minOrderValue`, `usedCount < usageLimit`, số đơn **chưa hủy** của user dùng mã này `< perUserLimit`.

**Tính tiền giảm:** `percentage` = `min(subtotal * value / 100, maxDiscount ?? ∞)`; `fixed_amount` = `min(value, subtotal)`; `free_shipping` = bằng `shippingFee`.

---

## 11. Vòng đời đơn hàng

```
pending ──► confirmed ──► processing ──► shipping ──► delivered ──► returned
   │            │
   └────────────┴──► cancelled
```

```ts
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['processing', 'cancelled'],
  processing: ['shipping'],
  shipping:   ['delivered'],
  delivered:  ['returned'],
  cancelled:  [],
  returned:   [],
};
```

- Mỗi lần đổi trạng thái thì `push` vào `statusHistory` và set mốc thời gian (`shippedAt`, `deliveredAt`...).
- **Khi hủy** (trong transaction): hoàn kho (`increment`), giảm `usedCount` của mã giảm giá; nếu đã thanh toán thì đặt `paymentStatus = refunded` (hoàn tiền thủ công hoặc gọi API refund).
- **Khi `delivered`**: tăng `soldCount` của product; COD thì đặt `paymentStatus = paid`.
- Customer chỉ tự hủy được khi đơn còn `pending`.

**Cron** (`@nestjs/schedule`, chạy mỗi 5 phút): đơn `vnpay`/`momo` ở trạng thái `pending` + `paymentStatus = pending` mà quá `ORDER_UNPAID_TIMEOUT_MINUTES` thì hủy và hoàn kho, với `changedBy: 'system'`.

---

## 12. Thanh toán

**COD:** đơn ở `pending`, nhân viên gọi xác nhận rồi chuyển sang `confirmed`.

**VNPay / MoMo:**
1. `POST /checkout` tạo `Payment { status: pending }`, tạo URL có chữ ký (VNPay: HMAC-SHA512, số tiền **nhân 100**; MoMo: HMAC-SHA256) rồi trả `paymentUrl`.
2. Người dùng thanh toán xong thì cổng gọi **IPN** về server:
   - Kiểm tra chữ ký → kiểm tra đơn tồn tại → kiểm tra **số tiền khớp** `order.total`.
   - **Idempotent**: nếu `paymentStatus` đã là `paid` thì chỉ trả OK, không xử lý lại.
   - Thành công: `Payment.status = paid` và lưu `transactionID`; `Order.paymentStatus = paid`, `paidAt`, `status = confirmed`.
   - Thất bại: `Payment.status = failed` (đơn vẫn `pending` để người dùng thanh toán lại).
   - Trả response đúng format mà cổng yêu cầu (VNPay cần `{ RspCode: '00', Message: 'Confirm Success' }`).
3. Trang `return` chỉ để frontend hiển thị kết quả. **Không cập nhật đơn ở `return`**, vì người dùng có thể sửa URL.

Viết theo strategy pattern giống `file-util` cũ: `PaymentGateway` interface, rồi `VnpayGateway` và `MomoGateway`.

> IPN cần URL public. Khi dev local, dùng `ngrok` hoặc `cloudflared tunnel` để cổng thanh toán gọi về được.

---

## 13. Seed data (`prisma/seed.ts`)

- 1 admin (`admin@homedecor.local`) và 2 customer.
- Danh mục:
  - Phòng khách: Sofa, Bàn trà, Kệ TV, Ghế thư giãn
  - Phòng ngủ: Giường, Tủ đầu giường, Bàn trang điểm
  - Phòng ăn: Bàn ăn, Ghế ăn, Tủ bếp
  - Trang trí: Đèn, Tranh, Gương, Thảm, Bình hoa, Nến thơm, Cây giả
  - Lưu trữ: Kệ sách, Tủ quần áo, Giỏ mây
- Vùng giao hàng: Nội thành HCM, Nội thành HN, Miền Nam, Miền Trung, Miền Bắc. Danh sách tỉnh nên giữ trong một file hằng số, dùng chung cho seed và validate địa chỉ.
- 20–30 sản phẩm mẫu, mỗi sản phẩm 1–4 variant, có kích thước và cân nặng.
- 2–3 mã giảm giá (`WELCOME10` loại percentage, `FREESHIP` loại free_shipping).

---

## 14. Lưu ý khi dùng Prisma + MongoDB

| Vấn đề | Cách xử lý |
|---|---|
| Không có `Decimal` | Tiền dùng `Int` (VND) |
| Không có `prisma migrate` | `prisma db push`; reset thì dùng `db push --force-reset`. Đổi tên field **không** tự chuyển dữ liệu, phải tự viết script |
| `@unique` trên field optional | MongoDB coi `null` là một giá trị, nên từ bản ghi thứ 2 có `null` sẽ lỗi trùng. Field unique thì **bắt buộc có giá trị**, còn không thì chỉ dùng `@@index` |
| `deletedAt: null` không khớp document thiếu field | Dùng `NOT_DELETED` (mục 6.1) |
| Không ràng buộc khóa ngoại ở DB | Prisma chỉ giả lập. Xóa danh mục hay sản phẩm luôn dùng **soft delete**; trước khi xóa cứng phải kiểm tra còn tham chiếu hay không |
| Transaction xung đột (`P2034`) | Retry (mục 10). Giữ transaction **ngắn**: không gọi API ngoài hay gửi mail bên trong |
| Không có full-text search | `contains` + `insensitive`, field `searchText` không dấu, hoặc Atlas Search |
| ID là ObjectId 24 ký tự hex | Validate bằng regex trước khi query, tránh lỗi `P2023` |
| Composite type (`type`) không có `@default(auto())` | Cần id ổn định thì tách thành model riêng (như `Address`) |
| Quan hệ nhiều-nhiều | Prisma bắt cả hai phía giữ mảng ID. Tránh nếu được (plan này đã tránh) |

---

## 15. Lộ trình

### Giai đoạn 1: Nền tảng
- [ ] Tạo project, copy hạ tầng (mục 2), cài dependencies
- [ ] Tạo cluster Atlas, viết `schema.prisma`, chạy `db:push` và `prisma:generate`
- [ ] Viết lại `PrismaService` (6.1), map lỗi Prisma (6.3), `IDDto` (6.4)
- [ ] Auth đã sửa lỗi (5.1), `AdminGuard` + `@AdminOnly()` (5.2), decorator `@Public()`
- [ ] Seed admin và danh mục
- [ ] Swagger chạy được tại `/api`

### Giai đoạn 2: Catalog
- [ ] Admin: CRUD danh mục (tự sinh slug), CRUD sản phẩm + variant, upload ảnh Cloudinary
- [ ] Tính lại `minPrice`, `maxPrice`, `colors` khi sửa variant
- [ ] Public: cây danh mục, lọc sản phẩm (mục 8), chi tiết, sản phẩm liên quan, `/products/filters`
- [ ] Seed sản phẩm mẫu

### Giai đoạn 3: Mua hàng
- [ ] Sổ địa chỉ, wishlist
- [ ] Giỏ hàng
- [ ] Vùng giao hàng + tính phí ship
- [ ] Mã giảm giá: validate và tính tiền giảm
- [ ] `checkout/preview` và `checkout` với COD (mục 10)
- [ ] Đơn của tôi, hủy đơn
- [ ] Admin: quản lý đơn, đổi trạng thái (mục 11), export Excel

### Giai đoạn 4: Thanh toán và thông báo
- [ ] VNPay sandbox: tạo URL, IPN, trang return
- [ ] MoMo sandbox
- [ ] Cron hủy đơn chưa thanh toán
- [ ] Email: xác nhận đơn, đổi trạng thái, quên mật khẩu

### Giai đoạn 5: Hoàn thiện
- [ ] Review + cập nhật `ratingAvg`, `ratingCount`
- [ ] Dashboard admin (dùng `aggregateRaw` cho doanh thu theo ngày)
- [ ] Unit test cho checkout, promotion, shipping, chuyển trạng thái đơn (phần dễ sai nhất)
- [ ] Deploy (Render, Railway hoặc VPS) + thêm IP server vào Atlas Network Access
