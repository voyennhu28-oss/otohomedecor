# Admin

## Khung

- `app/admin/layout.tsx`: `AuthGuard role='admin'` bọc `AdminShell`. Metadata `robots: noindex`.
- `AdminShell` = shadcn `Sidebar` (thu gọn thành icon, Ctrl+B) + `AdminTopbar`. Shell chỉ render ở client (sau `AuthGuard`) nên đọc cookie `sidebar_state` (do `SidebarProvider` tự ghi) ngay khi khởi tạo state mà không lệch HTML server.
- Vùng nội dung cùng padding ngang với topbar để mép trái tiêu đề thẳng breadcrumb, rộng tối đa `max-w-screen-2xl`.
- Sidebar: mobile là Sheet, bấm link xong tự đóng. Thu gọn: cột 48px, nhóm `px-2` để nút icon 32px nằm giữa; không đủ chỗ cho logo nên hiện icon cửa hàng. Mục menu: chữ màu chính, icon xám; mục đang mở có nền cát + icon đậm (không thêm vạch).
- Menu (`components/layout/admin-nav.ts`): mỗi nhóm nên có từ 2 mục, tránh menu vụn. `/admin` chỉ active đúng trang đó; mục khác active cả ở trang con. Breadcrumb đọc nhóm / trang từ đây, khớp đường dẫn dài nhất trước.
- Breadcrumb: Nhóm › Trang › Trang con. Không có gốc "Quản trị" (đã có cạnh logo). Nhóm không phải trang nên không có link. Đoạn con `new` / `edit` / `import` có tên riêng, còn lại (ID, mã đơn) là "Chi tiết". Mobile chỉ hiện trang hiện tại.
- `AdminPageHeader`: tiêu đề cỡ vừa (không dùng tiêu đề hero của shop), mô tả, nút thao tác bên phải.
- Trang chưa nối API dùng `ComingSoon` (giai đoạn + endpoint), xóa khi làm xong.

## Trang danh sách

- Tìm / lọc / sắp xếp / trang lưu trên URL bằng `useUrlFilters(defaults)`: F5 hay gửi link vẫn giữ nguyên. Giá trị bằng mặc định không ghi lên URL. Đổi bộ lọc tự về trang 1 (trừ khi đang đổi `page`). `reset()` chỉ bỏ các key hook quản lý. Giá trị URL sai (sửa tay) thì về mặc định (`parseOption`, `parsePositiveInt`). Component dùng hook phải nằm trong `<Suspense>`.
- `SearchInput`: debounce 300ms, Enter / nút xóa áp dụng ngay. URL đổi từ bên ngoài (Xóa bộ lọc, back / forward) thì ô nhập cập nhật theo.
- `DataTablePagination`: dùng cho phân trang ở client và ở server (`Page<T> = { list, totalItems, totalPages }`, có `totalPages` thì dùng luôn). Dãy số luôn có trang đầu, cuối và 2 trang mỗi bên trang hiện tại; cách nhau đúng 1 trang thì hiện số đó thay vì "…". Mobile chỉ "Trang x / y".
- `DataTableState` (trống / lỗi / không có kết quả), `DataTableSkeleton` (đang tải).
- Ô lọc đang khác mặc định có viền đậm hơn để dễ nhận ra.

## Dialog

- Form dài: header / footer cố định, chỉ thân form cuộn và ẩn thanh cuộn (`no-scrollbar`). Lỗi chung của server đặt ngoài vùng cuộn, ngay trên footer.
- Dialog mở bằng `target | null`: dùng `useRetainedValue` để giữ nội dung khi đóng; mỗi lần mở (target mới) tăng một bộ đếm làm `key` cho form để form tạo lại từ đầu.

## Danh mục (`features/admin-categories`)

- `GET /admin/categories` trả cả cây, không phân trang / lọc ở server → lọc, sắp xếp, phân trang ở client (`filters.ts`, có test).
- Không lọc: dạng cây (thụt lề 24px mỗi cấp, thu gọn / mở nhánh, "Thu gọn tất cả"). Dòng con đứng đầu trang mà cha ở trang trước thì ghi đường dẫn cha. Có lọc / tìm / sắp xếp khác mặc định: danh sách phẳng, mỗi dòng ghi đường dẫn cha.
- Trạng thái "Ẩn theo danh mục cha": tự danh mục đang bật nhưng có tổ tiên đang ẩn (public cũng ẩn cả nhánh).
- Tìm không dấu: "den" ra "Đèn" (`normalizeSearch`).
- Form: rule giống `CreateCategoryDto` / `UpdateCategoryDto`. Slug trống khi tạo → backend tự sinh; khi sửa slug bắt buộc (backend không sinh lại, chuỗi rỗng bị 400). Danh mục cha không được là chính nó hoặc con cháu. Tạo mới không gửi field trống; sửa chỉ gửi field đã đổi, ô mô tả / ảnh xóa trắng gửi `null`.
- Xóa: backend trả 409 khi còn danh mục con / sản phẩm, nên dialog báo trước và không hiện nút xóa.
- Ảnh danh mục nhập bằng URL (backend chưa có API upload ảnh danh mục).

## Sản phẩm (`features/admin-products`)

- **Danh sách** (`/admin/products`): phân trang, tìm (`q`: tên hoặc SKU), lọc trạng thái / danh mục / nổi bật **ở server** (`GET /admin/products`). Bộ lọc danh mục khớp **đúng** danh mục đó, không gồm danh mục con (giới hạn của API). Dùng `keepPreviousData` nên đổi trang không nháy trống, bảng mờ đi trong lúc tải.
- Chọn nhiều dòng (giữ qua các trang) để xuất Excel theo `ids`; nút "Xuất tất cả" không gửi `ids`. Backend không mở header `Content-Disposition` qua CORS nên FE không đọc được tên file, tự đặt `products_YYYY_MM_DD.xlsx` (`api.download` + `saveFile` trong `lib/api-client.ts`).
- Nhập Excel: chỉ tạo sản phẩm mới, hiện kết quả theo dòng (`created`, `errors[].rows`).
- **Tạo**: dialog `ProductCreateDialog` ngay trên trang danh sách (không có trang riêng). Form sản phẩm + danh sách biến thể (ít nhất 1, tối đa 50; nhân bản biến thể giữ thuộc tính, xóa SKU). Bấm lưu bị lỗi thì mở hết biến thể đang thu gọn để thấy lỗi. Đang lọc theo danh mục thì danh mục đó được chọn sẵn. Đóng dialog khi đã nhập dữ liệu thì hỏi xác nhận trước khi bỏ. Tạo xong đóng dialog, toast có nút "Thêm ảnh" dẫn tới `/admin/products/[id]?tab=images` (ảnh chỉ upload được sau khi có sản phẩm).
- **Sửa** (`/admin/products/[id]`): 3 tab lưu trên URL (`?tab=info|variants|images`). Tab Thông tin `keepMounted` để chuyển tab không mất dữ liệu đang sửa; chỉ gửi field đã đổi (so sánh JSON cho mảng).
- Biến thể: sửa không gửi `stock` (backend 400); tồn kho đổi qua dialog riêng: "Nhập / xuất kho" (`adjust`, âm để trừ) hoặc "Kiểm kê" (`stock`). FE chặn trừ quá số đang có trước khi gọi API.
- Sản phẩm "Đang bán" phải còn ≥ 1 biến thể đang bán: khóa nút ngừng bán / xóa biến thể đang bán cuối cùng (backend 409). Form tạo cũng kiểm tra điều này.
- Ảnh: jpg / png / webp, ≤ 5MB, ≤ 10 ảnh mỗi lần, kiểm tra ở FE trước khi gửi. Upload / xóa trả lại cả danh sách ảnh → ghi thẳng vào cache chi tiết. Không có API đổi thứ tự ảnh: ảnh đầu là ảnh đại diện.
- Ô số trong form dùng `requiredNumber` (trống → `NaN` → báo "Nhập ...") hoặc `optionalNumber` (trống → `null`) từ `components/admin/number-input.tsx`.
- Lỗi 409 trùng slug gắn vào ô slug, trùng SKU (dialog biến thể) gắn vào ô SKU; còn lại qua `setServerErrors`.
