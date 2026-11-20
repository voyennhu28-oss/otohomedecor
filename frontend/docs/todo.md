# Việc còn dở

- Thêm vào giỏ đã gọi API nhưng chưa có `CartSheet` / số lượng trên header để xem giỏ; toast chưa có nút "Xem giỏ".
- Admin sửa sản phẩm / danh mục / bộ sưu tập thì shop thấy chậm tối đa vài phút (cache `minutes`). Muốn thấy ngay cần route handler gọi `revalidateTag(CATALOG_TAGS...)` khi admin lưu, hoặc backend gọi webhook.
- Nội dung nháp cần chỉnh theo thực tế: danh sách loại vỏ dùng làm đèn (trang chủ), các bước làm một chiếc đèn.
- Header: nút giỏ hàng (`CartSheet`) đặt cạnh `HeaderUserMenu` khi có API giỏ hàng.
- Footer: thông tin liên hệ (địa chỉ, số điện thoại), mạng xã hội.
- Ảnh danh mục đang nhập bằng URL; muốn upload cần thêm endpoint ở backend.
- **Hằng số phân loại của backend là đồ nội thất** (`ROOMS`, `STYLES`, `MATERIALS` trong `backend/src/common/constants/catalog.const.ts`: sồi, óc chó, mây, sofa...), không có vỏ sò. FE (`constants/catalog.ts`) đang dùng đúng danh sách backend; muốn đổi phải sửa backend trước rồi cập nhật nhãn ở FE.
- Backend chưa có: đổi thứ tự ảnh sản phẩm, sửa `alt` ảnh, upload ảnh riêng cho biến thể.
- Backend nên thêm `exposedHeaders: ['Content-Disposition']` vào CORS để FE đọc được tên file Excel.
