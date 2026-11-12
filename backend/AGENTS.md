# AGENTS.md

## Project: Home Decor API

API bán đồ nội thất / trang trí cho **một cửa hàng** (không có vendor). Stack: NestJS + Prisma + MongoDB Atlas.

Plan đầy đủ nằm ở [`../home-decor-api-plan.md`](../home-decor-api-plan.md): schema Prisma đầy đủ (mục 3), code mẫu cho `PrismaService`, checkout, phí ship, và danh sách API. **Đọc mục liên quan trong plan trước khi code một module.** File này chỉ tóm tắt các quy tắc bắt buộc. Nếu plan và file này mâu thuẫn, làm theo file này và báo lại cho người dùng.

Plan được viết dựa trên project cũ `ecommerce_t11_2025`, nên nhiều chỗ ghi "copy từ project cũ". Nếu không truy cập được project cũ thì viết mới theo mô tả trong plan, đừng tự đoán code cũ trông như thế nào.

### Môi trường thực tế (khác plan ở vài điểm)

| | Thực tế trong repo | Ghi chú |
|---|---|---|
| NestJS | **12** | Plan ghi 11. Dùng 12, không hạ version |
| TypeScript | 6, `module: nodenext` | |
| Module system | **CommonJS** | `package.json` không có `"type": "module"`. Import tương đối **không** thêm đuôi `.js`. Không tự chuyển sang ESM |
| Node | 24 | Đủ điều kiện `require(esm)` để tải package ESM-only của Nest |
| Lint | `oxlint` (`npm run lint`) | Plan nhắc tới `eslint.config.mjs` của project cũ, nhưng repo dùng oxlint |
| Test | Jest 30 + ts-jest | `*.spec.ts` trong `src/`, e2e trong `test/` |
| ORM | Prisma **6.x** (6.19) | Không lên Prisma 7 trước khi kiểm tra lại hỗ trợ MongoDB |
| DB | MongoDB Atlas (replica set, dùng được transaction) | `DATABASE_URL` phải có tên DB: `.../home_decor?...` |

Các thư viện khác: Zod (+ `nestjs-zod`, `zod-prisma-types`), JWT, Cloudinary, exceljs (chỉ cho admin import/export), `@nestjs/schedule` (cron), nodemailer, `ms`, `dayjs`.

### Lệnh

```bash
npm run start:dev        # dev server
npm run lint
npm test                 # unit test
npm run test:e2e
# Prisma (thêm vào package.json theo plan mục 2.6)
npm run db:push          # tạo collection + index từ schema
npm run prisma:generate
npm run db:seed
```

**Mỗi lần sửa `prisma/schema.prisma` phải chạy lại `db:push` và `prisma:generate`.** MongoDB không dùng `prisma migrate`. Đổi tên field không tự chuyển dữ liệu, phải viết script riêng.

### Cấu trúc thư mục

```
prisma/schema.prisma, prisma/seed.ts
src/
  catch-everything/      filter lỗi toàn cục (có map lỗi Prisma)
  logger/
  common/
    constants/catalog.const.ts   ROOMS, STYLES, MATERIALS (+ danh sách tỉnh)
    decorators/          user, cookie, public, admin-only
    guards/              auth.guard.ts, admin.guard.ts
    prisma/              prisma.module.ts, prisma.service.ts
    dto/param.dto.ts     objectId, IDDto
  generated/zod/         sinh tự động, không sửa tay
  app/                   mỗi collection một module (giống project cũ)
    auth, users, addresses, categories, products, product-variants,
    product-images, carts, shipping-zones, promotions, checkout,
    orders, payments, reviews, dashboard
```

- Mỗi model trong `schema.prisma` là một module trong `src/app/`. Dữ liệu nhúng (`CartItem`, `OrderItem`, `ShippingAddress`, `ImageItem`) nằm trong module của document cha, **không** tạo module riêng. Wishlist nằm trong `users` (mảng trên User).
- Không tạo lại các module cũ: `cart-items`, `order-items`, `order-addresses`, `order-promotions`, `product-categories`, `vendors`, `user-vendor-roles`, `roles`, `permissions`, `role-permissions`.
- Mỗi module có 2 controller dùng chung một service: `xxx.controller.ts` (public/customer) và `admin-xxx.controller.ts` (gắn `@AdminOnly()` ở cấp class, route `/admin/...`). Module chỉ có phía admin thì chỉ cần controller admin.
- Gọi chéo module qua service được `export`, không truy vấn thẳng collection của module khác.
- Prefix API là `/api`.

### Quy tắc bắt buộc

**Dữ liệu và schema**
- Khóa ngoại đặt tên theo kiểu `xxxID` (`userID`, `productID`, `variantID`...). `removeFieldsAndRelations` trong `init.ts` có hard-code `userID`.
- Tiền luôn là `Int` (VND). Prisma + MongoDB không có `Decimal`.
- Mọi product có **ít nhất 1 variant**. Giỏ hàng và đơn hàng luôn trỏ tới `variantID`.
- **Không đặt tên field là `by`** (trong model hay composite type): `zod-prisma-types` crash với lỗi `Cannot read properties of undefined (reading 'getZodScalarType')`.
- Chỉ đặt `@unique` trên field **bắt buộc có giá trị**. Field optional dùng `@@index` (MongoDB coi `null` là giá trị nên sẽ trùng).
- `minPrice`, `maxPrice`, `colors` trên Product được lưu thừa: **tính lại sau mỗi lần tạo/sửa/xóa variant**.
- Giá trị `rooms` / `styles` / `materials` lấy từ `catalog.const.ts` và validate bằng `z.enum`.
- Không tạo quan hệ nhiều-nhiều. Room/style là mảng string trên Product.

**Prisma**
- Service truy vấn qua `this.prisma.extended.<model>`, hoặc `this.extended` nếu kế thừa `PrismaBaseService` (client đã extend, tự lọc soft delete). `client` / `this.prisma.<model>` là client gốc, chỉ dùng khi cần đọc cả bản ghi đã xóa. Model soft delete: `User`, `Category`, `Product`, `ProductVariant`, `Promotion`. Xóa bằng `softDelete()`, không xóa cứng các model này.
- Soft delete bản ghi có field `@unique` do người dùng đặt (slug, sku, code): đổi luôn giá trị đó thành `<giá trị>--deleted-<id>` để giải phóng, vì index unique vẫn tính bản ghi đã xóa. Xem `CategoriesService.remove`. Riêng email của User thì giữ nguyên (chưa chốt).
- Lọc "chưa xóa" phải dùng `NOT_DELETED` (`deletedAt` null **hoặc** chưa tồn tại), không viết `deletedAt: null`.
- Bên trong `$transaction(async (tx) => ...)`, `tx` là client gốc, **không** có filter soft delete. Phải tự thêm `...NOT_DELETED` vào `where`.
- Giữ transaction ngắn: **không** gọi cổng thanh toán, Cloudinary hay gửi mail bên trong transaction. Bọc transaction có ghi tồn kho bằng `withRetry` (retry khi gặp lỗi `P2034`).
- Validate ObjectId bằng `objectId` (regex 24 ký tự hex) trước khi query.

**Input và bảo mật**
- DTO đầu vào **viết tay cho từng endpoint** (`createZodDto(z.object({...}))`). Không dùng schema sinh tự động trong `src/generated/zod` cho input, vì client sẽ gửi được `total`, `status`, `role`... Schema sinh tự động chỉ dùng cho response hoặc làm gốc để `.pick()`.
- Route `/me/...` luôn lọc theo `userID` **lấy từ token**, không bao giờ lấy từ body hay param.
- **Không tin giá từ client.** Giá, phí ship, giảm giá, tổng tiền đều tính lại ở server từ DB.
- CORS: `origin` cụ thể (từ `FE_URL`, tách bằng dấu phẩy) và `credentials: true`. Không dùng `'*'`.

**Auth và phân quyền**
- 2 vai trò: `admin`, `customer` (`User.role`). Không có bảng Role/Permission.
- Global guard theo thứ tự: `ThrottlerGuard`, rồi `AuthGuard`, rồi `AdminGuard`. Route mặc định cần đăng nhập. Dùng `@Public()` để mở, `@AdminOnly()` cho admin.
- JWT payload: `{ userID, userEmail, role, type }`. Access token và refresh token dùng **secret khác nhau** (`JWT_SECRET` / `JWT_REFRESH_SECRET`) và claim `type: 'access' | 'refresh'`. Lỗi verify token luôn `throw new UnauthorizedException()`, không trả `undefined`.
- `sign-up` luôn tạo `customer`. Admin chỉ tạo qua seed, `POST /admin/users`, hoặc do admin khác đổi role.
- Trong `/admin/users`: admin không được tự hạ role, tự khóa hay tự xóa chính mình. Xóa user là soft delete. Response không bao giờ trả `password`, `resetPasswordToken`.
- User `inactive` đăng nhập thì trả 403. `logout` là POST.
- `forgot-password` và `reset-password` là `@Public()`. Reset dùng token gửi qua email (lưu dạng hash, hết hạn sau 15 phút). `change-password` là một endpoint riêng, cần đăng nhập và mật khẩu cũ.

**Lỗi**
- `CatchEverythingFilter` map lỗi Prisma: `P2002` → 409, `P2025` → 404, `P2023` → 400, `P2034` → 409. Các lỗi còn lại → 500.

**Checkout** (plan mục 10, phần dễ sai nhất)
- Toàn bộ chạy trong 1 transaction: đọc giỏ → đọc variant + product từ DB → kiểm tra địa chỉ thuộc user → kiểm tra trạng thái và tồn kho → tính tiền → trừ kho → tăng lượt dùng mã → tạo đơn → xóa giỏ.
- Trừ kho **atomic**: `updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })`. Nếu `count === 0` thì 409. Bỏ qua bước này với sản phẩm `allowBackorder`.
- Tăng `usedCount` của mã giảm giá cũng atomic, có điều kiện `usedCount < usageLimit`.
- Đơn hàng là **snapshot**: lưu tên, sku, giá, ảnh, địa chỉ tại thời điểm đặt. Không join lại product khi hiển thị đơn.
- Tạo link thanh toán và gửi email **sau** transaction. Gửi mail không được chặn response.

**Vòng đời đơn hàng** (plan mục 11)
- Bước chuyển hợp lệ: `pending → confirmed | cancelled`, `confirmed → processing | cancelled`, `processing → shipping`, `shipping → delivered`, `delivered → returned`. Từ chối mọi bước khác.
- Mỗi lần đổi trạng thái: `push` vào `statusHistory` và set mốc thời gian tương ứng.
- Hủy (trong transaction): hoàn kho, giảm `usedCount` của mã, nếu đã trả tiền thì `paymentStatus = refunded`.
- `delivered`: tăng `soldCount`. Đơn COD thì đặt `paymentStatus = paid`.
- Customer chỉ tự hủy được khi đơn còn `pending`.
- Cron mỗi 5 phút: hủy đơn `vnpay`/`momo` còn `pending` và chưa trả tiền quá `ORDER_UNPAID_TIMEOUT_MINUTES`, với `changedBy: 'system'`.

**Thanh toán** (plan mục 12)
- Strategy pattern: interface `PaymentGateway`, với `VnpayGateway` và `MomoGateway`.
- **Chỉ IPN được cập nhật đơn.** Trang `return` chỉ để hiển thị, vì người dùng sửa được URL.
- IPN: kiểm tra chữ ký → đơn tồn tại → số tiền khớp `order.total` → **idempotent** (đã `paid` thì chỉ trả OK) → cập nhật. Trả response đúng format của cổng.
- VNPay: HMAC-SHA512, số tiền **nhân 100**. MoMo: HMAC-SHA256.

**Lọc sản phẩm** (plan mục 8)
- `count` phải dùng **cùng `where`** với `findMany`.
- Tìm kiếm bằng `contains` + `mode: 'insensitive'` (Prisma không có full-text search trên MongoDB).
- Lọc theo danh mục phải gồm cả danh mục con.

### Biến môi trường

Khai báo trong `.example.env` và validate trong `src/common/envs/validate.env.ts` (bật `validate` trong `ConfigModule`). Danh sách đầy đủ ở plan mục 2.4: `PORT`, `APP_PREFIX`, `APP_NAME`, `NODE_ENV`, `FE_URL`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_*`, `MAIL_*`, `VNPAY_*`, `MOMO_*`, `ORDER_UNPAID_TIMEOUT_MINUTES`, `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (tùy chọn, cho `db:seed`), cùng với `OBSERVE_APP_KEY`, `OBSERVE_APP_SECRET` (xem mục Observe bên dưới).

### Lộ trình

Làm theo thứ tự 5 giai đoạn ở plan mục 15 (nền tảng → catalog → mua hàng → thanh toán và thông báo → hoàn thiện). Khi xong một mục thì đánh dấu checkbox trong plan. Unit test bắt buộc cho checkout, promotion, shipping và chuyển trạng thái đơn.

---

## NestJS

This app's version of NestJS is likely newer than what you know. https://docs.nestjs.com/llms.txt indexes its documentation, with a markdown page per chapter.

Nest has first-party packages for these, so check them before adding another library or writing your own:

- Databases: [`@nestjs/typeorm`](https://docs.nestjs.com/data/typeorm.md), [`@nestjs/drizzle`](https://docs.nestjs.com/data/drizzle.md), [`@nestjs/mongoose`](https://docs.nestjs.com/data/mongodb.md), [`@nestjs/sequelize`](https://docs.nestjs.com/data/sequelize.md).
- OpenAPI: [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction.md). GraphQL: [`@nestjs/graphql`](https://docs.nestjs.com/graphql/quick-start.md). WebSockets: [`@nestjs/websockets`](https://docs.nestjs.com/websockets/gateways.md). Microservices: [`@nestjs/microservices`](https://docs.nestjs.com/microservices/basics.md).
- Sign-in: [`@nestjs/authentication`](https://docs.nestjs.com/security/authentication.md). Permissions: [`@nestjs/authorization`](https://docs.nestjs.com/security/authorization.md). Rate limiting: [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting.md).
- Configuration: [`@nestjs/config`](https://docs.nestjs.com/application/configuration.md). Caching: [`@nestjs/cache-manager`](https://docs.nestjs.com/data/caching.md). Health checks: [`@nestjs/terminus`](https://docs.nestjs.com/reliability/terminus.md). Events inside the app: [`@nestjs/event-emitter`](https://docs.nestjs.com/application/events.md).
- Email: [`@nestjs/mail`](https://docs.nestjs.com/application/mail.md). Files, S3 included: [`@nestjs/storage`](https://docs.nestjs.com/application/file-storage.md). Translations: [`@nestjs/i18n`](https://docs.nestjs.com/application/i18n.md).
- Retries, timeouts and circuit breakers: [`@nestjs/resilience`](https://docs.nestjs.com/reliability/resilience.md).
- Idempotency keys: [`@nestjs/idempotency`](https://docs.nestjs.com/reliability/idempotency.md). Transactional outbox: [`@nestjs/outbox`](https://docs.nestjs.com/reliability/outbox.md). Sending and receiving webhooks: [`@nestjs/webhooks`](https://docs.nestjs.com/http/webhooks.md).
- Queues: [`@nestjs/bullmq`](https://docs.nestjs.com/application/queues.md). Scheduled jobs: [`@nestjs/schedule`](https://docs.nestjs.com/application/task-scheduling.md).
- Running a scheduled job on one instance, and locks: [`@nestjs/locks`](https://docs.nestjs.com/reliability/locks.md). Processes that take days: [`@nestjs/workflows`](https://docs.nestjs.com/reliability/workflows.md).
- Language models, tools and agents: [`@nestjs/ai`](https://docs.nestjs.com/ai/overview.md). MCP servers: [`@nestjs/mcp`](https://docs.nestjs.com/mcp/overview.md).

Validation works with Zod, Valibot, ArkType or any other Standard Schema library, with no classes or decorator metadata: `StandardSchemaValidationPipe` with `@Body({ schema })` or `@Param('id', { schema })` (https://docs.nestjs.com/application/validation.md). `class-validator` still works, through `ValidationPipe`.

`NodeAdapter` from `@nestjs/platform-node` is the fastest HTTP adapter, ahead of Fastify (https://docs.nestjs.com/http/performance.md).

Nest's packages are ESM only. A CommonJS project loads them through `require(esm)`, which needs Node.js 20.19+ or 22.12+, and doesn't have to convert (https://docs.nestjs.com/migration-guide.md).

## Production data: NestJS Observe

This app reports its traces, errors, logs and metrics to [NestJS Observe](https://observe.nestjs.com) through `ObserveModule` in `src/app.module.ts`. Its key pair comes from `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in `.env`, which `npx @nestjs/observe link` writes.

When a task depends on how the app behaves in production - an error users hit, a slow endpoint, a failing job, whether a release made things worse - work from that data, not from the code alone:

- The Observe MCP server answers those questions directly: errors with their traces and logs, slow operations, jobs, and what a release changed (`find_regressions`, `diff_release`). It is included on the Pro plan and above. In Claude Code: `claude mcp add observe --transport http https://observe-api.nestjs.com/mcp`, and the client opens a browser to approve. Other clients: https://www.observe.nestjs.com/documentation/mcp
- Without it, the user can open the request or error in the Observe dashboard and click **Copy agent prompt**, which hands over that page's trace, stack and logs as text.
