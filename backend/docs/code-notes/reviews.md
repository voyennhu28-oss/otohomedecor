# Module `reviews` (src/app/reviews)

## `src/app/reviews/admin-reviews.controller.ts`

- **AdminReviewsController › findList**: Mọi review (cả đang ẩn / chờ duyệt), lọc theo trạng thái, sản phẩm, số sao.
- **AdminReviewsController › updateStatus**: Ẩn hoặc duyệt review. Điểm đánh giá của sản phẩm được tính lại ngay.
- **AdminReviewsController › removeImage**: Gỡ ảnh không phù hợp khỏi review (xóa luôn trên Cloudinary).

## `src/app/reviews/dto/review.dto.ts`

- **ReviewListQueryDto**: GET /products/:productID/reviews?rating=5&sort=newest&page=1
- **ReviewListQueryDto › rating** (`rating: ratingQuery.optional(),`): chỉ xem review N sao
- **CreateReviewDto**: POST /products/:productID/reviews. Chỉ khi có đơn ĐÃ GIAO chứa sản phẩm; mỗi đơn 1 review.
  Không gửi orderID thì tự chọn đơn đã giao gần nhất chưa đánh giá.
- **UpdateReviewDto**: PATCH /reviews/:id (chủ review). comment = null để xóa nội dung.
- **AdminReviewListQueryDto**: GET /admin/reviews
- **UpdateReviewStatusDto**: PATCH /admin/reviews/:id/status: ẩn (hidden), duyệt (approved) hoặc chờ duyệt (pending).

## `src/app/reviews/review-images.controller.spec.ts`

- **(đầu file)**: Qua HTTP để chạy thật ZodValidationPipe (param) và multer (giới hạn số ảnh, loại file).
- **describe('ReviewImagesController') › moduleRef › providers**: giả lập AuthGuard: gắn user đang đăng nhập

## `src/app/reviews/review-images.controller.ts`

- **ReviewImagesController**: Ảnh của review, chỉ chủ review. Tạo review (JSON) trước, rồi upload ảnh.
- **ReviewImagesController › upload**: multipart/form-data, field "files": jpg / png / webp, 5MB mỗi ảnh, tối đa 5 ảnh mỗi review.

## `src/app/reviews/review-images.service.spec.ts`

- **describe('ReviewImagesService') › describe('upload') › it('chủ review: upload rồi thêm vào cuối, sortOrder nối tiếp; public_id riêng cho review')** (`expect(fs.unlink).toHaveBeenCalledTimes(2);`): luôn xóa file tạm
- **describe('ReviewImagesService') › describe('upload') › it('2 lần upload song song: lúc lưu (trong transaction) đã đủ ảnh → 400 và xóa ảnh vừa upload')** (`.mockResolvedValueOnce({ images: [image('a')] })`): kiểm tra trước: còn chỗ
- **describe('ReviewImagesService') › describe('upload') › it('2 lần upload song song: lúc lưu (trong transaction) đã đủ ảnh → 400 và xóa ảnh vừa upload')** (`});`): lúc lưu: request kia đã thêm

## `src/app/reviews/review-images.service.ts`

- **ReviewImagesService**: Ảnh của review (mảng `images` nhúng trong Review). Ảnh lưu trên Cloudinary.
- **ReviewImagesService › upload**: Chủ review thêm ảnh. Kiểm tra số ảnh 2 lần: trước khi upload (không upload thừa) và trong
  transaction lúc lưu (2 lần upload song song không vượt giới hạn; vượt thì ảnh vừa upload bị xóa).
- **ReviewImagesService › removeMine**: Chủ review gỡ ảnh.
- **ReviewImagesService › removeAsAdmin**: Admin gỡ ảnh không phù hợp (không cần là chủ review).
- **ReviewImagesService › updateImages**: Đọc - sửa - ghi lại mảng ảnh trong transaction (Prisma không có `pull` cho composite list).
  Có userID thì chỉ chủ review mới sửa được; review của người khác → 404.

## `src/app/reviews/review-rating.ts`

- **RatingStats**: Thống kê số sao của các review đã duyệt.
- **RatingStats › average** (`average: number;`): làm tròn 1 chữ số thập phân, 0 nếu chưa có review
- **RatingStats › distribution** (`distribution: Record<1 | 2 | 3 | 4 | 5, number>;`): số review theo từng mức sao
- **roundRating**: Điểm trung bình làm tròn 1 chữ số (4.333 → 4.3), như hiển thị trên trang sản phẩm.
- **buildRatingStats**: Từ kết quả groupBy theo rating → thống kê đủ 5 mức sao (mức không có review = 0).

## `src/app/reviews/reviews.controller.ts`

- **ReviewsController › findByProduct**: Review đã duyệt của sản phẩm đang bán, phân trang, kèm thống kê số sao.
- **ReviewsController › create**: Chỉ khi có đơn đã giao chứa sản phẩm này; mỗi đơn 1 review.
- **ReviewsController › update**: Chỉ chủ review.
- **ReviewsController › remove**: Chỉ chủ review.

## `src/app/reviews/reviews.module.ts`

- **ReviewsModule › imports** (`ProductsModule,`): kiểm tra sản phẩm, lưu ratingAvg / ratingCount
- **ReviewsModule › imports** (`OrdersModule,`): đơn đã giao chứa sản phẩm (điều kiện viết review)
- **ReviewsModule › imports** (`FileUtilModule,`): multer lưu file tạm + upload Cloudinary (ảnh review)

## `src/app/reviews/reviews.service.spec.ts`

- **O1** (`const O1 = 'bbbbbbbbbbbbbbbbbbbbbbbb';`): đơn giao gần nhất
- **describe('ReviewsService') › expectRatingRecalculated**: ratingAvg / ratingCount được tính lại trong cùng transaction, chỉ từ review đã duyệt.
- **describe('ReviewsService') › describe('findPublic') › it('chỉ review đã duyệt của sản phẩm đang bán; không lộ email / userID; kèm thống kê') › stats** (`stats: { average: 3.9, count: 11, distribution: { 5: 8, 1: 3 } },`): (8×5 + 3×1) / 11 = 3.909
- **describe('ReviewsService') › describe('create') › it('tự chọn đơn đã giao gần nhất chưa đánh giá; tính lại điểm trong cùng transaction')** (`review.findMany.mockResolvedValue([{ orderID: O1 }]);`): đơn O1 đã đánh giá

## `src/app/reviews/reviews.service.ts`

- **PUBLIC_REVIEW_SELECT**: Review công khai: tên + ảnh đại diện người viết, KHÔNG lộ email / userID / orderID.
- **ReviewsService**: Quy tắc:
   - Chỉ viết review khi có đơn ĐÃ GIAO chứa sản phẩm; mỗi đơn 1 review (unique userID + productID + orderID).
   - Mọi thay đổi review (thêm / sửa / xóa / đổi trạng thái) tính lại ratingAvg, ratingCount của
     product TRONG CÙNG transaction. Chỉ review "approved" được tính và hiển thị.
- **ReviewsService › findPublic**: GET /products/:productID/reviews: review đã duyệt + thống kê số sao (luôn tính trên mọi review đã duyệt).
- **ReviewsService › create**: 2 request cùng lúc cho cùng đơn: index unique chặn bản thứ 2
- **ReviewsService › removeMine**: Xóa review, rồi xóa ảnh của nó trên Cloudinary (chạy nền, sau khi DB đã xóa).
- **ReviewsService › updateStatus**: Ẩn / duyệt review: review không còn "approved" thì không tính vào điểm và không hiển thị.
- **ReviewsService › pickOrderToReview**: Đơn dùng để viết review: đơn đã giao chứa sản phẩm và chưa có review của user.
  Gửi orderID thì phải là 1 trong các đơn đó; không gửi thì lấy đơn giao gần nhất chưa đánh giá.
- **ReviewsService › inTransaction**: Ghi review rồi tính lại điểm của product trong 1 transaction. Bước tính lại ghi vào
  document product, nên 2 review cùng lúc cho 1 sản phẩm sẽ xung đột và chạy lại tuần tự
  → ratingAvg / ratingCount luôn đúng.
