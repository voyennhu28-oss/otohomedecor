<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md: Frontend otohomedecor

## Project

Frontend cho website bán đồ nội thất / trang trí của **một cửa hàng**. Gồm 2 phía trong cùng một app Next.js:

- **Shop**: khách xem sản phẩm, giỏ hàng, đặt hàng, tài khoản.
- **Admin** (`/admin/...`): quản lý sản phẩm, đơn hàng, khuyến mãi, user, dashboard.

Backend NestJS nằm ở `../backend`. Quy tắc nghiệp vụ ở [`../backend/AGENTS.md`](../backend/AGENTS.md), spec API ở [`../docs/api-docs/`](../docs/api-docs/README.md) (viết theo code thực tế), lộ trình nối API ở [`../docs/frontend-roadmap.md`](../docs/frontend-roadmap.md). **Không tự đoán endpoint, field hay format response.** Đọc plan, code controller/DTO trong `../backend/src/app/<module>`, hoặc Swagger tại `http://localhost:5000/api` (khi backend đang chạy).

## Môi trường

|                | Trong repo                                                                                                                                              | Ghi chú                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js        | **16.4.6**, App Router                                                                                                                                  | Turbopack là mặc định. `next.config.ts` bật `cacheComponents` và `partialPrefetching`: cách cache khác bản cũ, đọc docs trong `node_modules/next/dist/docs/` trước khi viết code lấy dữ liệu |
| React          | 19.3                                                                                                                                                    |                                                                                                                                                                                              |
| TypeScript     | 5, `strict`                                                                                                                                             | Alias `@/*` → `src/*`. Luôn import bằng `@/...`, không dùng `../../`                                                                                                                         |
| Tailwind       | **4.3**, nạp qua `@tailwindcss/turbopack` (loader trong `next.config.ts`)                                                                               | Không có `postcss.config` và `tailwind.config`. Không tự thêm, không đổi sang `@tailwindcss/postcss` khi chưa hỏi                                                                            |
| shadcn         | 4.23, style `base-maia` (đã chỉnh sang gần vuông, xem mục Component và giao diện), base color `neutral` (màu đã chỉnh sang tông ấm trong `globals.css`) | Component dựng trên **Base UI** (`@base-ui/react`), **không phải Radix**                                                                                                                     |
| Icon           | `@hugeicons/react` (bộ icon của shadcn), `lucide-react` cũng có cài                                                                                     | Component mới dùng hugeicons. Không trộn 2 bộ trong cùng một màn hình                                                                                                                        |
| Form           | `react-hook-form` + `zod` **4** + `@hookform/resolvers`                                                                                                 | Backend dùng zod **3**: không import schema từ backend sang                                                                                                                                  |
| Dữ liệu từ API | `@tanstack/react-query` 5                                                                                                                               |                                                                                                                                                                                              |
| State toàn cục | `zustand` 5                                                                                                                                             |                                                                                                                                                                                              |
| Khác           | `date-fns` 4, `next-themes`, `sonner` (toast)                                                                                                           |                                                                                                                                                                                              |
| Lint / format  | ESLint 9 (`npm run lint`), Prettier + `prettier-plugin-tailwindcss`                                                                                     | Chưa có test                                                                                                                                                                                 |

Trước khi cài thư viện mới, kiểm tra `package.json` xem đã có thứ tương đương chưa.

## Lệnh

```bash
npm run dev                       # http://localhost:3000 (khớp FE_URL của backend)
npm run build
npm run lint
npx prettier --write .
npx shadcn@latest add <component> # thêm component shadcn, KHÔNG viết tay
```

Backend chạy ở `http://localhost:5000`, prefix `/api` (`cd ../backend && npm run start:dev`).

## Cấu trúc thư mục

```
src/
  app/
    layout.tsx, globals.css   root layout: font, providers
    (shop)/                   layout có SiteHeader + SiteFooter
      page.tsx                → /            landing page
      products/               → /products, /products/[slug]
      about/  contact/        → /about, /contact
      blog/                   → /blog, /blog/[slug]  (backend CHƯA có API blog)
      account/                → /account (+ orders, orders/[orderNumber], addresses, wishlist), layout có AccountNav
    (auth)/                   layout căn giữa, không header/footer
      sign-in/  sign-up/      → /sign-in, /sign-up
    admin/                    → /admin/... layout có AdminSidebar, không dùng header/footer của shop
  components/
    ui/                     component shadcn (sinh bằng CLI)
    layout/                 Header, Footer, Sidebar, CartSheet...
  features/<domain>/        products, cart, checkout, orders, auth, admin-...
    components/  hooks/  schemas.ts  types.ts
  lib/                      utils.ts (cn), api-client.ts, format.ts
  hooks/                    hook dùng chung
  services/                 hàm gọi API, mỗi module backend một file (product.service.ts...)
  stores/                   zustand
  types/                    type dùng chung (ApiResponse, Paginated...)
  constants/
```

- Chỉ folder có `page.tsx` / `route.ts` mới thành URL. Component chỉ dùng cho một route thì để trong `_components/` cạnh route đó.
- `(shop)`, `(auth)` là route group, không xuất hiện trên URL. `admin/` là folder thường vì URL cần có `/admin`. Trang khách hàng nằm trong `(shop)/account` để giữ header/footer của shop.
- Tên route khớp với backend: `/products/[slug]`, `/sign-in`, `/sign-up`, `/account/orders/[orderNumber]`.
- `src/app/api/` chỉ dùng cho việc nhỏ. Logic nghiệp vụ nằm ở backend.

## Gọi API backend

**Format response**: mọi response được bọc thành `{ errors, data, message }`.

- Thành công: `{ errors: null, data: ..., message: 'OK' }`. Code FE lấy `data` ra.
- Lỗi: `{ errors: [{ message }], data: null, message: 'ERROR' }`. Hiện `errors[0].message` (bằng toast hoặc `setError` của form).
- API có phân trang trả kèm `totalPages`, `totalItems`: xem đúng shape trong `../backend/src/common/utils/pagination-util` trước khi viết type.

**Một client duy nhất**: mọi request đi qua `src/lib/api-client.ts`, không rải `fetch` khắp nơi. Base URL lấy từ `NEXT_PUBLIC_API_URL` (vd `http://localhost:5000/api`).

**Auth bằng cookie httpOnly** (backend set): `accessToken` sống 15 phút, `refreshToken` sống 7 ngày (path `/api/auth`).

- FE **không** đọc, không lưu token (không localStorage, không state). Mọi request gửi `credentials: 'include'`.
- Gặp 401: gọi `POST /auth/refresh-token` **một lần** rồi gửi lại request. Nhiều request cùng 401 thì dùng chung một promise refresh. Refresh thất bại: xóa user khỏi state (cache `['me']` của React Query); nếu đang ở `/account` hoặc `/admin` thì chuyển về `/sign-in?next=...`. Trang công khai không chuyển hướng.
- **Mỗi `page.tsx`** nằm dưới layout bọc `AuthGuard` (`admin/`, `(shop)/account/`) phải có `export const instant = false`. AuthGuard chờ `/me` ở trình duyệt mới render trang con nên trang không prerender được; Next coi mọi page không khai báo là `instant = true` và báo lỗi "dropped segment". Đặt ở layout **không** áp xuống page.
- Biết ai đang đăng nhập bằng `GET /me`. Chặn trang admin (`app/admin/layout.tsx`) theo `role === 'admin'` từ `/me`. Bảo vệ thật nằm ở backend (`@AdminOnly`). Không dựa vào `proxy.ts` để check đăng nhập, vì ở production cookie thuộc domain API nên FE có thể không đọc được.

**Chống CSRF và loại body** (backend chặn):

- Request ghi dữ liệu phải gửi từ trình duyệt ở `FE_URL`. Body phải là JSON (`Content-Type: application/json`) hoặc multipart. Form-urlencoded / text-plain bị trả 415.
- Không submit `<form action="...">` thẳng sang API. Luôn gọi qua `api-client`.

**Server hay client lấy dữ liệu**:

- Dữ liệu public (sản phẩm, danh mục, bộ lọc) lấy ở Server Component để tốt cho SEO.
- Dữ liệu riêng của user (giỏ hàng, `/me`, đơn hàng, toàn bộ admin) lấy ở client bằng React Query, có `credentials: 'include'`.

## Quy tắc nghiệp vụ phía FE

- **Tiền là số nguyên VND.** Format bằng một helper chung trong `lib/format.ts` (`Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`).
- **Không gửi giá lên backend và không tự tính tổng tiền để thanh toán.** Bảng tính tiền lấy từ `POST /checkout/preview`. FE chỉ hiển thị.
- Mỗi sản phẩm có ít nhất 1 variant. Giỏ hàng và đơn hàng dùng `variantID`, nên phải chọn variant trước khi thêm vào giỏ.
- Giỏ hàng (`GET /me/cart`) trả giá và tồn kho hiện tại, có đánh dấu item hết hàng / ngừng bán. Phải hiển thị trạng thái này.
- Giá trị bộ lọc (rooms, styles, materials, colors, khoảng giá) lấy từ `GET /products/filters`, không hard-code.
- URL sản phẩm dùng `slug`. Một số endpoint (review) dùng `id`: kiểm tra plan.
- **Đơn hàng là snapshot**: hiển thị tên, giá, ảnh, địa chỉ lấy từ chính đơn, không gọi lại API sản phẩm.
- **Chuyển khoản (SePay)**: `POST /checkout` trả `payment` (ngân hàng, số tài khoản, số tiền, nội dung chuyển khoản, `qrUrl`, hạn thanh toán). Hiện QR rồi poll `GET /me/orders/:orderNumber` tới khi `paymentStatus = paid`. Không có trang return. **FE không bao giờ tự đánh dấu đã trả tiền.**
- Khách chỉ tự hủy được đơn khi còn `pending`. Ẩn nút hủy ở các trạng thái khác.
- Upload ảnh: multipart, field `files`, jpg / png / webp, tối đa 5MB mỗi ảnh. Review tối đa 5 ảnh.

## Component và giao diện

- **Không viết comment giải thích trong code** (`//`, `/** */`, `{/* */}`). Lý do thiết kế, quy tắc ngầm, TODO ghi vào `docs/` (thư mục frontend, xem `docs/README.md`). Chỉ giữ directive có tác dụng (`eslint-disable...`, `@ts-...`).
- Mặc định là Server Component. Chỉ thêm `"use client"` khi cần state / event / hook trình duyệt, và giữ phần client nhỏ nhất có thể.
- Component shadcn thêm bằng CLI. Được sửa trong `components/ui/`, nhưng sửa ít và có lý do.
- **Base UI khác Radix**: ví dụ shadcn cũ dùng `asChild`, còn Base UI dùng prop `render`. Code copy từ tutorial Radix phải chuyển lại cho đúng.
- Ghép class bằng `cn()` từ `@/lib/utils`.
- Màu, bo góc, font dùng token trong `globals.css` (`bg-background`, `text-muted-foreground`, `rounded-lg`...). Không hard-code mã màu hex trong component.
- **Cửa hàng tên "O The o"**, bán chủ yếu **đèn trang trí làm từ vỏ sò**, làm thủ công (không phải đèn ngủ: đừng viết nội dung xoay quanh giấc ngủ). Logo ảnh (`public/images/oto_logo.png`) dùng qua `BrandLogo` (`@/components/brand-logo`) ở header, footer và trang auth (desktop: góc trên panel tối; mobile: header sáng). Trên nền tối để cỡ lớn (`h-20`) vì chữ nâu hơi chìm. Không gõ tay tên ở chỗ khác.
- **Phong cách: ấm, mềm, kiểu thương hiệu mỹ phẩm Việt.** Tham khảo bố cục https://cocoonvietnam.com/ (chỉ tham khảo bố cục và cảm giác, không copy ảnh, chữ, logo, màu thương hiệu). **Nền giữ trắng.**
  - Bo góc: `--radius: 0.25rem`, mọi mức từ `rounded-lg` tới `rounded-4xl` đều bằng giá trị này (tối đa 4px). Ảnh sản phẩm và ảnh trong mục bo `rounded-lg`; ảnh hero tràn viền thì không bo. Nút gần vuông (`rounded-sm`). Không dùng nút hình viên thuốc (`rounded-full`) trừ avatar và badge tròn.
  - Màu: nền trắng, chữ gần đen ngả ấm (`foreground`), chữ phụ xám ấm (`muted-foreground`), mảng phụ màu cát nhạt (`secondary`, `muted`) cho nền ảnh, ô icon. Không có màu nhấn rực: ảnh sản phẩm và ánh đèn là điểm màu. Không thêm màu nhấn khi chưa hỏi người dùng.
  - Font (đều có tiếng Việt):
    - `font-heading` = **Cormorant Garamond** (500/600, thường + nghiêng). Tiêu đề, tên sản phẩm, chữ trang trí. `h1`–`h3` tự dùng font này với `font-medium`. Viết thường kiểu câu; khi in hoa luôn giãn chữ bằng `display-caps` (giống "O T H E o" trong logo). Không dùng Cormorant cho chữ dưới 18px.
    - `font-sans` = **Be Vietnam Pro** (400/500/600) cho nội dung, form, nút, nhãn.
    - Utility trong `globals.css`: `label-caps` = nhãn nhỏ in hoa giãn chữ (nút, eyebrow, tiêu đề cột footer), giống tagline logo. `display-caps` = chữ hoa Cormorant giãn rộng (cỡ chữ đặt riêng).
    - Font mới **bắt buộc có bộ chữ tiếng Việt** (`subsets: ["latin", "vietnamese"]`). Không dùng Bebas Neue, Figtree hay font nào thiếu tiếng Việt (Cinzel, Marcellus tuy giống logo nhưng thiếu tiếng Việt).
  - Tiêu đề mục ghép 2 cách viết của Cormorant: phần nghiêng + phần chữ hoa giãn rộng, vd "_Sản phẩm_ NỔI BẬT". Dùng component `SectionTitle` (`@/components/section-title`).
  - Nút chính: `CtaLink` (`(shop)/_components/cta-link.tsx`): cao 56–64px, chữ `label-caps` bên trái, mũi tên bên phải, nền tối (`solid`) hoặc viền (`outline`). Link phụ kiểu chữ + mũi tên (`ArrowLink`).
  - Bố cục:
    - Hero chia đôi (ảnh tràn nửa trái, chữ nửa phải).
    - Dải chữ lớn chạy ngang (`Marquee`, tắt khi giảm chuyển động).
    - Sản phẩm dạng băng trượt ngang có thanh tiến độ (`ProductRail`).
    - Khoảng trắng rộng.
- Admin: dùng chung token với shop, nhưng dày hơn: `size="sm"`, bảng padding nhỏ, tiêu đề cỡ vừa (không dùng tiêu đề hero cỡ lớn).
  - Khung: `AdminShell` = shadcn `Sidebar` (thu gọn thành icon, Ctrl+B) + `AdminTopbar` (breadcrumb, nút xem cửa hàng). Menu tài khoản / đăng xuất ở chân sidebar.
  - Thêm trang mới: khai báo mục menu trong `components/layout/admin-nav.ts` (breadcrumb đọc tên trang từ đây). Mỗi trang mở đầu bằng `AdminPageHeader` (tiêu đề, mô tả, nút thao tác).
  - Trang danh sách: tìm / lọc / sắp xếp / trang lưu trên URL bằng `useUrlFilters` (`hooks/use-url-filters.ts`, component phải nằm trong `<Suspense>`), dùng chung `SearchInput` (có debounce), `DataTablePagination`, `DataTableState` / `DataTableSkeleton` trong `components/admin/`. Mẫu: `features/admin-categories`.
  - Dialog có form dài: header / footer cố định, chỉ thân form cuộn và ẩn thanh cuộn (`no-scrollbar`).
- Giỏ hàng dạng panel trượt ra dùng component `Sheet`. Thông báo dùng `sonner`.
- Chữ trên giao diện bằng **tiếng Việt**. Ngày giờ format bằng `date-fns` với locale `vi`.

## Form

- `react-hook-form` + `zodResolver`. Schema đặt ở `features/<domain>/schemas.ts`.
- Rule validate (độ dài, bắt buộc...) giữ giống DTO của backend. Lỗi từ server đưa vào `setError` hoặc toast.

## Biến môi trường

- `.env` không commit (đã có trong `.gitignore`).
- Biến dùng ở trình duyệt phải có tiền tố `NEXT_PUBLIC_` và **không bao giờ chứa secret**.
- Hiện cần: `NEXT_PUBLIC_API_URL`.

## Trước khi báo xong

1. `npm run lint` và `npm run build` không lỗi.
2. Thay đổi đụng tới API thì đã đối chiếu với controller / DTO của backend.
3. Nếu đổi quy ước trong file này thì cập nhật file và báo cho người dùng.
