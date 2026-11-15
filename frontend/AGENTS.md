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

Backend NestJS nằm ở `../backend`. Quy tắc nghiệp vụ ở [`../backend/AGENTS.md`](../backend/AGENTS.md), danh sách API ở [`../home-decor-api-plan.md`](../home-decor-api-plan.md) mục 7. **Không tự đoán endpoint, field hay format response.** Đọc plan, code controller/DTO trong `../backend/src/app/<module>`, hoặc Swagger tại `http://localhost:5000/api` (khi backend đang chạy).

## Môi trường

| | Trong repo | Ghi chú |
|---|---|---|
| Next.js | **16.4.6**, App Router | Turbopack là mặc định. `next.config.ts` bật `cacheComponents` và `partialPrefetching`: cách cache khác bản cũ, đọc docs trong `node_modules/next/dist/docs/` trước khi viết code lấy dữ liệu |
| React | 19.3 | |
| TypeScript | 5, `strict` | Alias `@/*` → `src/*`. Luôn import bằng `@/...`, không dùng `../../` |
| Tailwind | **4.3**, nạp qua `@tailwindcss/turbopack` (loader trong `next.config.ts`) | Không có `postcss.config` và `tailwind.config`. Không tự thêm, không đổi sang `@tailwindcss/postcss` khi chưa hỏi |
| shadcn | 4.23, style `base-maia` (đã chỉnh sang gần vuông, xem mục Component và giao diện), base color `neutral` | Component dựng trên **Base UI** (`@base-ui/react`), **không phải Radix** |
| Icon | `@hugeicons/react` (bộ icon của shadcn), `lucide-react` cũng có cài | Component mới dùng hugeicons. Không trộn 2 bộ trong cùng một màn hình |
| Form | `react-hook-form` + `zod` **4** + `@hookform/resolvers` | Backend dùng zod **3**: không import schema từ backend sang |
| Dữ liệu từ API | `@tanstack/react-query` 5 | |
| State toàn cục | `zustand` 5 | |
| Khác | `date-fns` 4, `next-themes`, `sonner` (toast) | |
| Lint / format | ESLint 9 (`npm run lint`), Prettier + `prettier-plugin-tailwindcss` | Chưa có test |

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
    (shop)/                 layout có header, footer, giỏ hàng
      page.tsx              → /
      shop/                 → /shop (danh sách + lọc)
      product/[slug]/       → /product/:slug
      checkout/
      account/              → /account/orders, addresses, wishlist...
    (auth)/                 login, register, forgot-password, reset-password
    (admin)/admin/          layout có sidebar → /admin/...
    layout.tsx, globals.css
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
- `(shop)`, `(auth)`, `(admin)` là route group, không xuất hiện trên URL.
- `src/app/api/` chỉ dùng cho việc nhỏ. Logic nghiệp vụ nằm ở backend.

## Gọi API backend

**Format response**: mọi response được bọc thành `{ errors, data, message }`.
- Thành công: `{ errors: null, data: ..., message: 'OK' }`. Code FE lấy `data` ra.
- Lỗi: `{ errors: [{ message }], data: null, message: 'ERROR' }`. Hiện `errors[0].message` (bằng toast hoặc `setError` của form).
- API có phân trang trả kèm `totalPages`, `totalItems`: xem đúng shape trong `../backend/src/common/utils/pagination-util` trước khi viết type.

**Một client duy nhất**: mọi request đi qua `src/lib/api-client.ts`, không rải `fetch` khắp nơi. Base URL lấy từ `NEXT_PUBLIC_API_URL` (vd `http://localhost:5000/api`).

**Auth bằng cookie httpOnly** (backend set): `accessToken` sống 15 phút, `refreshToken` sống 7 ngày (path `/api/auth`).
- FE **không** đọc, không lưu token (không localStorage, không state). Mọi request gửi `credentials: 'include'`.
- Gặp 401: gọi `POST /auth/refresh-token` **một lần** rồi gửi lại request. Nhiều request cùng 401 thì dùng chung một promise refresh. Refresh thất bại: xóa user khỏi state, chuyển về `/login`.
- Biết ai đang đăng nhập bằng `GET /me`. Chặn trang admin theo `role === 'admin'` từ `/me`. Bảo vệ thật nằm ở backend (`@AdminOnly`). Không dựa vào `proxy.ts` để check đăng nhập, vì ở production cookie thuộc domain API nên FE có thể không đọc được.

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

- Mặc định là Server Component. Chỉ thêm `"use client"` khi cần state / event / hook trình duyệt, và giữ phần client nhỏ nhất có thể.
- Component shadcn thêm bằng CLI. Được sửa trong `components/ui/`, nhưng sửa ít và có lý do.
- **Base UI khác Radix**: ví dụ shadcn cũ dùng `asChild`, còn Base UI dùng prop `render`. Code copy từ tutorial Radix phải chuyển lại cho đúng.
- Ghép class bằng `cn()` từ `@/lib/utils`.
- Màu, bo góc, font dùng token trong `globals.css` (`bg-background`, `text-muted-foreground`, `rounded-lg`...). Không hard-code mã màu hex trong component.
- **Phong cách: gần vuông, đơn sắc, kiểu tạp chí.** Tham khảo bố cục https://ovo-cozy.webflow.io/ (chỉ tham khảo bố cục và cảm giác, không copy ảnh, chữ, thương hiệu):
  - Bo góc: `--radius: 0.25rem`, và mọi mức từ `rounded-lg` tới `rounded-4xl` đều bằng giá trị này (tối đa 4px). Ảnh sản phẩm và khối ảnh lớn để **vuông** (không thêm `rounded-*`). Không dùng nút hình viên thuốc (`rounded-full`) trừ avatar và badge tròn.
  - Màu: nền trắng, chữ gần đen, xám nhạt làm nền ảnh sản phẩm. Ảnh sản phẩm là điểm nhấn màu duy nhất. Không thêm màu nhấn khi chưa hỏi người dùng.
  - Font: tiêu đề `font-heading` (**Oswald**, viết hoa, cỡ lớn). `h1`–`h3` tự dùng font này. Nội dung `font-sans` (**Inter**). Font mới **bắt buộc có bộ chữ tiếng Việt** (`subsets: ["latin", "vietnamese"]`). Không dùng Bebas Neue, Figtree hay font nào thiếu tiếng Việt.
  - Khoảng trắng rộng, mỗi mục lớn gần chiếm trọn một màn hình trên desktop. Link điều hướng kiểu chữ + mũi tên →.
- Admin: dùng chung token với shop, nhưng dày hơn: `size="sm"`, bảng padding nhỏ, tiêu đề cỡ vừa (không dùng tiêu đề hero cỡ lớn).
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
