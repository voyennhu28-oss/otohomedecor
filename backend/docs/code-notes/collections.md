# Module `collections` (src/app/collections)

## `src/app/collections/admin-collections.controller.ts`

- **AdminCollectionsController**: Gán / gỡ sản phẩm: POST, DELETE /admin/collections/:collectionID/products (module products).
  Danh sách sản phẩm của bộ sưu tập: GET /admin/products?collectionID=
- **AdminCollectionsController › uploadImage**: multipart/form-data, field "file". Thay ảnh bìa hiện tại (ảnh cũ bị xóa trên Cloudinary).

## `src/app/collections/collection-image.service.ts`

- **CollectionImageService**: Ảnh bìa bộ sưu tập: mỗi bộ sưu tập 1 ảnh, upload ảnh mới thì ảnh cũ bị xóa.
- **CollectionImageService › upload**: Upload lên Cloudinary, lưu vào DB, rồi mới xóa ảnh cũ (lỗi lưu DB thì ảnh mới bị xóa).

## `src/app/collections/collection.util.ts`

- **unsetOr**: Field chưa có trong document cũ cũng tính như null (giống NOT_DELETED).
- **visibleCollectionWhere**: Bộ sưu tập khách được thấy: đang bật và `now` nằm trong khoảng [startsAt, endsAt).
- **scheduleError**: Trả về thông báo lỗi nếu khoảng thời gian sai, null nếu hợp lệ.

## `src/app/collections/collections.controller.ts`

- **CollectionsController**: Sản phẩm của một bộ sưu tập: GET /products?collection=<slug> (dùng chung lọc / sắp xếp / phân trang).

## `src/app/collections/collections.module.ts`

- **CollectionsModule › imports**: FileUtilModule: multer lưu file tạm + ImageUploadService (Cloudinary) cho ảnh bìa
- **CollectionsModule › exports** (`exports: [CollectionsService],`): products dùng để lọc theo bộ sưu tập và gán sản phẩm

## `src/app/collections/collections.service.spec.ts`

- **describe('CollectionsService')**: $transaction(fn) gọi fn với tx = chính mock này

## `src/app/collections/collections.service.ts`

- **SUMMARY_SELECT**: Thông tin gắn kèm sản phẩm (badge, link sang trang bộ sưu tập).
- **CollectionsService › findPublicList**: GET /collections: bộ sưu tập đang hiển thị.
- **CollectionsService › findPublicBySlug**: GET /collections/:slug. 404 nếu đang tắt hoặc ngoài thời gian hiển thị.
- **CollectionsService › getVisibleIDBySlug**: ID của bộ sưu tập đang hiển thị theo slug, null nếu không có. Products dùng để lọc.
- **CollectionsService › findVisibleByIDs**: Bộ sưu tập đang hiển thị trong danh sách ID (trang chi tiết sản phẩm).
- **CollectionsService › findByIDs**: Bộ sưu tập chưa xóa (mọi trạng thái) trong danh sách ID (trang admin).
- **CollectionsService › ensureAllExist**: Ném 404 nếu có ID không tồn tại hoặc đã bị xóa. Products dùng khi gán collectionIDs.
- **CollectionsService › findAdminList**: GET /admin/collections: tất cả (cả đang tắt / hết hạn). Số sản phẩm lấy qua GET /admin/products?collectionID=
- **CollectionsService › remove**: Soft delete + đổi slug để giải phóng (index @unique tính cả bản ghi đã xóa).
  Product.collectionIDs vẫn giữ ID này: mọi chỗ đọc đều chỉ lấy bộ sưu tập chưa xóa nên không ảnh hưởng.
  Giữ ảnh bìa trên Cloudinary vì soft delete còn khôi phục được.
- **CollectionsService › setImage**: Thay (hoặc bỏ khi `image` = null) ảnh bìa. Trả về ảnh cũ để xóa trên Cloudinary sau khi DB đã ghi.
  Transaction: 2 lần upload chen nhau thì lần sau xung đột và chạy lại, không làm sót ảnh cũ.
- **CollectionsService › assertSlugAvailable**: Dùng client gốc vì index @unique của slug tính cả bản ghi đã xóa.

## `src/app/collections/dto/collection.dto.ts`

- **CreateCollectionDto**: POST /admin/collections. Không gửi slug thì tự sinh từ name. Ảnh bìa upload riêng.
- **UpdateCollectionDto**: PATCH /admin/collections/:id. Đổi name KHÔNG tự đổi slug.
  startsAt / endsAt gửi null để bỏ giới hạn. Kiểm tra khoảng thời gian với giá trị đang lưu ở service.
- **CollectionListQueryDto**: GET /collections?featured=true
