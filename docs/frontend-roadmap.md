# Lộ trình nối API cho frontend

Dựa trên `docs/api-docs` (89 endpoint). Admin làm trước (44 endpoint `/admin/...`), shop làm sau.
Toàn bộ trang admin đã nối API (khung `ComingSoon` đã xóa). Phần còn lại là shop.

Thứ tự admin theo phụ thuộc dữ liệu: có danh mục → có sản phẩm → khách mới đặt được đơn → dashboard mới có số liệu.

| GĐ | Nội dung | Endpoint | Trạng thái |
|---|---|---|---|
| 0 | Nền tảng | | Format response + layout xong, còn lại chưa |
| 1 | Danh mục, sản phẩm, variant, ảnh, bộ sưu tập | 19 + 9 | Xong |
| 2 | Đơn hàng, thanh toán | 6 | Xong |
| 3 | Dashboard | 1 | Xong |
| 4 | Khuyến mãi, vùng giao hàng | 10 | Xong |
| 5 | Tài khoản, đánh giá | 8 | Xong |
| 6+ | Shop | 45 | |

---

## GĐ 0: Nền tảng (làm trước mọi thứ)

- [x] Format response: backend đăng ký `FormatResponseInterceptor` global, mọi response thành công bọc `{ errors, data, message }` khớp `api-client.ts`. File Excel và webhook SePay không bọc.
- [x] Layout admin: sidebar thu gọn được (Ctrl+B, nhớ trạng thái bằng cookie), topbar có breadcrumb, menu tài khoản, `AdminPageHeader`.
- [x] `types/api.ts`: `Page<T> = { list, totalItems, totalPages }`; enum dùng chung (`OrderStatus`, `PaymentStatus`, `PaymentMethod`, `ProductStatus`, `ReviewStatus`...) theo `models.md`.
- [x] `api-client`: thêm hàm tải file (blob + tên file từ `Content-Disposition`) cho các route export Excel.
- [x] Bộ component bảng dùng chung: `useUrlFilters`, `SearchInput`, `DataTablePagination`, `DataTableState` / `DataTableSkeleton` (lọc lưu trên URL để F5 / chia sẻ link giữ nguyên).
- [ ] `StatusBadge` (nhãn tiếng Việt cho trạng thái đơn, thanh toán, sản phẩm...), dialog xác nhận xóa, trạng thái rỗng / lỗi / đang tải.
- [ ] shadcn cần thêm: `table`, `select`, `tabs`, `textarea`, `switch`, `checkbox`, `alert-dialog`, `popover`, `calendar` (chọn khoảng ngày), `pagination`.

## GĐ 1: Danh mục & sản phẩm

Tài liệu: 05, 06, 07, 08.

- [x] **Danh mục** (`/admin/categories`): bảng dạng cây (thu gọn / mở nhánh), tìm theo tên / slug (không phân biệt dấu), lọc trạng thái / cấp / thuộc danh mục / số sản phẩm, sắp xếp, phân trang (làm ở client vì API trả cả cây; lưu trên URL), thêm / sửa / thêm danh mục con trong dialog, ẩn / hiện nhanh, xóa có xác nhận (báo trước khi còn danh mục con / sản phẩm). Ảnh nhập bằng URL vì backend chưa có API upload ảnh danh mục.
- [x] **Sản phẩm** (`/admin/products`): danh sách lọc theo `q`, `status`, `categoryID`, `isFeatured`, phân trang ở server; tạo trong dialog trên trang danh sách (form + ít nhất 1 variant), trang sửa `/admin/products/[id]` chia tab: Thông tin / Biến thể / Ảnh.
- [x] **Variant**: thêm / sửa / nhân bản / ngừng bán / xóa trong tab Biến thể; điều chỉnh tồn kho `PATCH /admin/variants/:id/stock` (nhập-xuất hoặc kiểm kê).
- [x] **Ảnh**: upload multipart field `files` (jpg / png / webp, ≤ 5MB, kéo thả), xóa theo `publicID`.
- [x] **Excel**: xuất (tất cả hoặc các dòng đã chọn), nhập (`file` .xlsx) rồi hiện kết quả `created` / `errors` theo số dòng.
- [x] **Bộ sưu tập** (`/admin/collections`, thêm sau khi backend có module collections): CRUD trong dialog, ảnh bìa, thời gian hiển thị, bật / tắt, nổi bật; dialog gán / gỡ sản phẩm; form sản phẩm chọn bộ sưu tập; lọc sản phẩm theo bộ sưu tập.

## GĐ 2: Đơn hàng & thanh toán

Tài liệu: 13, 14.

- [x] **Đơn hàng** (`/admin/orders`): lọc theo trạng thái (tab), phương thức, trạng thái thanh toán, khoảng ngày, mã đơn, email. Xuất Excel theo bộ lọc đang chọn.
- [x] **Chi tiết** (`/admin/orders/[id]`): sản phẩm (snapshot trong đơn), địa chỉ, bảng tiền, `statusHistory` dạng timeline, giao dịch SePay. Nút đổi trạng thái **chỉ hiện bước hợp lệ** (bảng chuyển trạng thái trong 13-orders.md), có ô ghi chú; hủy thì bắt buộc lý do. Nút "Xác nhận đã nhận tiền" (`mark-paid`) cho đơn chuyển khoản chưa trả.
- [x] **Thanh toán** (`/admin/payments`): giao dịch SePay, lọc `status=failed` để đối soát, link sang đơn tương ứng.

## GĐ 3: Dashboard

Tài liệu: 16. Biểu đồ dùng shadcn `chart` (recharts, đã cài theo đồng ý của người dùng).

- [x] Chọn khoảng ngày; 4 thẻ số: doanh thu, số đơn, giá trị đơn trung bình, đơn hủy.
- [x] Biểu đồ doanh thu theo ngày, số đơn theo trạng thái, top sản phẩm.
- [x] "Cần xử lý": đơn chờ xác nhận, giao dịch lỗi, hàng sắp hết (link sang sản phẩm / đơn).
- [x] Badge số đơn `pending` trên mục "Đơn hàng" của sidebar (lấy `totalItems` của `GET /admin/orders?status=pending`).

## GĐ 4: Khuyến mãi & vùng giao hàng

Tài liệu: 10, 11. Cần xong trước khi làm checkout ở shop (phí ship và mã giảm giá tính ở `POST /checkout/preview`).

- [x] **Khuyến mãi**: CRUD mã giảm giá. Form đổi theo `type` (`percentage` có `maxDiscount`; `free_shipping` ẩn ô giá trị), đơn tối thiểu, tổng lượt / lượt mỗi khách, `startsAt` / `endsAt`, bật / tắt.
- [x] **Vùng giao hàng**: CRUD vùng; chọn nhiều tỉnh (34 giá trị `PROVINCES`), phí cơ bản theo `baseWeightKg`, phí mỗi kg, phụ phí cồng kềnh, ngưỡng free ship, số ngày giao.

## GĐ 5: Tài khoản & đánh giá

Tài liệu: 03 (phần admin), 15 (phần admin).

- [x] **Tài khoản** (`/admin/users`): lọc `q`, `role`, `status`; chi tiết có sổ địa chỉ, số đơn, tổng chi tiêu; tạo tài khoản (cả admin), khóa / mở, xóa. Ẩn thao tác tự hạ quyền / tự khóa / tự xóa chính mình (backend cũng chặn).
- [x] **Đánh giá** (`/admin/reviews`): lọc theo trạng thái, sao, sản phẩm; duyệt / ẩn / đưa về chờ duyệt; xóa ảnh vi phạm.

## GĐ 6+: Shop

1. Danh mục, sản phẩm, bộ lọc, chi tiết, sản phẩm liên quan (Server Component, tốt cho SEO).
2. Giỏ hàng (Sheet), wishlist, sổ địa chỉ, thông tin tài khoản, đổi mật khẩu.
3. Checkout: preview → đặt hàng → màn hình QR SePay + poll trạng thái; đơn của tôi, hủy đơn `pending`.
4. Viết / sửa đánh giá kèm ảnh (đơn đã giao).
