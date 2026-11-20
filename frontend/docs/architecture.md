# Kiến trúc

## Gọi API (`lib/api-client.ts`)

- Backend bọc mọi response thành công bằng `FormatResponseInterceptor`: `{ errors: null, data, message }`. Client trả về `data`. Body thiếu `data` nghĩa là backend chạy bản cũ hoặc sai địa chỉ: client ném `ApiError` ("Phản hồi từ máy chủ không đúng định dạng") thay vì trả `undefined` (React Query không nhận `undefined`).
- Token nằm trong cookie httpOnly do backend set. FE không đọc / lưu token, mọi request gửi `credentials: 'include'`.
- Body chỉ là JSON hoặc `FormData` (multipart). `FormData` để trình duyệt tự đặt `Content-Type` kèm boundary.
- Gặp 401: gọi `POST /auth/refresh-token` một lần rồi gửi lại. Nhiều request cùng 401 dùng chung một promise refresh. Refresh thất bại → gọi handler do `Providers` đăng ký (xóa `['me']`, trang `/account` / `/admin` thì chuyển về `/sign-in?next=`).
- `skipAuthRefresh`: dùng cho chính các route auth, không tự refresh.
- 429 đổi thành câu "Bạn thử quá nhiều lần. Đợi 1 phút rồi thử lại."
- Mỗi module backend một file trong `services/`. Đầu mỗi service tương ứng controller trong `../backend/src/app/<module>` và file trong `docs/api-docs`.

## Lỗi form (`lib/form-errors.ts`)

`setServerErrors(setError, error, { fields, conflictField })`: lỗi validate của backend có `fields` (tên field cấp 1); field nào có trên form thì hiện dưới ô đó, còn lại hiện ở `errors.root.server` (component `FormAlert`). 409 (trùng email, slug...) gắn vào `conflictField`.

## React Query (`components/providers.tsx`)

- `staleTime` mặc định 60s. Lỗi 4xx không thử lại (sai quyền / không tìm thấy thử lại vô ích), lỗi khác thử tối đa 2 lần.
- `useMe` (`['me']`): `null` = chưa đăng nhập (401), `undefined` = đang tải. `retry: false` vì header chờ kết quả này; thử lại khi backend không phản hồi làm header trống thêm vài giây. Lỗi thì coi như chưa đăng nhập, React Query tự hỏi lại khi có mạng / quay lại tab.
- Đăng xuất: xóa `['me']` và mọi query khác (dữ liệu riêng của user cũ) rồi về trang chủ.
- Đăng nhập / đăng ký xong: ghi user vào cache `['me']`, chuyển tới `?next=` nếu là đường dẫn nội bộ (chặn `//evil.com`, `https://...`), không thì admin vào `/admin`, khách vào `/account`.

## Xác thực ở client

- `AuthGuard` chặn trang dựa vào `GET /me`, chỉ để giao diện đúng. Bảo vệ thật ở backend (`@AdminOnly`, guard JWT).
- Không check đăng nhập ở `proxy.ts`: ở production cookie thuộc domain API nên FE không đọc được.
- Response sign-in / sign-up có `accessToken` / `refreshToken` cho app mobile; type `AuthResult` cố ý không khai báo để web không đọc / lưu.
- Schema form giữ đúng rule DTO backend (`../backend/src/app/auth/dto`, `users/dto/user-fields.ts`). Mật khẩu đếm theo byte (bcrypt chỉ dùng 72 byte đầu, chữ có dấu 2–3 byte). `confirmPassword` chỉ kiểm tra ở FE. `phone` trống thì không gửi (DTO `.strict()`).
- `forgot-password` luôn trả cùng một câu dù email có tồn tại hay không (chống dò email).
- Link đặt lại mật khẩu: backend gửi `${FE_URL}/reset-password?token=...`, token là hex 64 ký tự.

## Next 16

- `cacheComponents` bật: component dùng `useSearchParams` / `usePathname` ở route động phải nằm trong `<Suspense>` (vd `ShopNavLinks` có fallback `ShopNavList` không active; form reset mật khẩu; các trang admin dùng `useUrlFilters`).
- **Instant navigation**: Next coi mọi `page.tsx` không khai báo là `instant = true`. Trang sau `AuthGuard` chỉ render sau khi có `/me` ở trình duyệt nên bị bỏ khi prerender ("dropped segment"). Vì vậy **mỗi** `page.tsx` dưới `admin/` và `(shop)/account/` có `export const instant = false`. Đặt ở layout không áp xuống page.
- Trang động (`/products/[slug]`, `/blog/[slug]`, `/account/orders/[orderNumber]`): khi làm thật đọc params bằng `await props.params`; phần đọc params / gọi API bọc `<Suspense>` hoặc có `loading.tsx`.
- **Dữ liệu public ở server** (`features/catalog/queries.ts`): mỗi hàm `'use cache'` + `cacheTag` (`CATALOG_TAGS`) + `cacheLife('minutes')`. Gọi qua `catalogService`, mỗi request có `skipAuthRefresh` (không đụng `refreshPromise` dùng chung của module, nguyên nhân lỗi "use cache awaiting a promise created outside it") và `AbortSignal.timeout(8000)` (backend trên Render ngủ thì mất ~20s mới dậy).
  - Gọi API lỗi: **không ném lỗi** trong `'use cache'` (lỗi lúc prerender làm hỏng build), trả `null` / `[]` với `cacheLife('seconds')` để không bị cache lâu và Next không đưa vào static shell.
  - Trang chủ (prerender): `getFeaturedProducts` / `getShowcaseCollections` khi nhận `null` gọi thêm `connection()` để phần đó render lại lúc request thay vì đóng băng thông báo lỗi.
  - HTML prerender có skeleton đứng trước rồi mới tới nội dung thật trong `<div hidden id="S:…">` (React thay vào ngay khi tải). Thấy chữ skeleton trong HTML không có nghĩa là thiếu dữ liệu.
- Vitest trên Windows: chạy từ thư mục có ổ đĩa viết hoa (`C:\...`, như PowerShell / pre-commit). Chạy từ đường dẫn `c:/...` hoặc `/c/...` (Git Bash) thì Vitest nạp 2 bản và mọi file báo "failed to find the current suite".
- Ảnh URL do admin nhập (domain bất kỳ) dùng `<img>` thay vì `next/image` (cần khai báo `remotePatterns`), kèm `eslint-disable-next-line @next/next/no-img-element`.

## Hook dùng chung

- `useIsMobile` (`hooks/use-mobile.ts`): shadcn sinh ra rồi viết lại bằng `useSyncExternalStore` (bản gốc gọi setState trong effect, bị rule `react-hooks/set-state-in-effect` chặn).
- `useRetainedValue`: giữ giá trị khác `null` gần nhất. Dialog điều khiển bằng `item | null`: khi đóng, dialog còn chạy hiệu ứng mờ dần, nội dung vẫn là item cũ thay vì trống / nhảy chữ. Cập nhật state trong lúc render (mẫu "lưu giá trị từ lần render trước" của React).
- `useUrlFilters`: xem [admin.md](admin.md#trang-danh-sách).

## Type

- Type khớp `docs/api-docs/models.md`, ngày giờ là chuỗi ISO, tiền là số nguyên VND (`formatVND`: `4200000` → `4.200.000 ₫`).
- `User` đã bỏ field nhạy cảm (`password`, `resetPasswordToken`, `resetPasswordExp`, `tokenVersion`).
