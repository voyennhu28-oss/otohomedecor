# Việc còn dở

- **Landing page dùng dữ liệu giữ chỗ** (`app/(shop)/_components/placeholder-data.ts`): thay `FEATURED_PRODUCTS` bằng `GET /products/featured` (Server Component). Shape giữ chỗ không phải shape API; khi nối dùng type trong `features/products/types.ts`.
- Nội dung nháp cần chỉnh theo thực tế: danh sách loại vỏ dùng làm đèn (trang chủ), các bước làm một chiếc đèn.
- Header: nút giỏ hàng (`CartSheet`) đặt cạnh `HeaderUserMenu` khi có API giỏ hàng.
- Footer: thông tin liên hệ (địa chỉ, số điện thoại), mạng xã hội.
- Ảnh danh mục đang nhập bằng URL; muốn upload cần thêm endpoint ở backend.
- **Hằng số phân loại của backend là đồ nội thất** (`ROOMS`, `STYLES`, `MATERIALS` trong `backend/src/common/constants/catalog.const.ts`: sồi, óc chó, mây, sofa...), không có vỏ sò. FE (`constants/catalog.ts`) đang dùng đúng danh sách backend; muốn đổi phải sửa backend trước rồi cập nhật nhãn ở FE.
- Backend chưa có: đổi thứ tự ảnh sản phẩm, sửa `alt` ảnh, upload ảnh riêng cho biến thể.
- Backend nên thêm `exposedHeaders: ['Content-Disposition']` vào CORS để FE đọc được tên file Excel.
