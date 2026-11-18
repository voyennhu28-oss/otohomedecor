# Module `product-images` (src/app/product-images)

## `src/app/product-images/admin-product-images.controller.spec.ts`

- **describe('AdminProductImagesController')**: Test qua HTTP để chạy thật ZodValidationPipe (param) và multer (FilesInterceptor + fileFilter).
  Multer không có storage → giữ file trong bộ nhớ, service được mock.

## `src/app/product-images/admin-product-images.controller.ts`

- **AdminProductImagesController › upload**: multipart/form-data, field "files" (chọn được nhiều ảnh).

## `src/app/product-images/product-images.const.ts`

- **IMAGE_UPLOAD_OPTIONS**: Chỉ nhận ảnh jpg / png / webp, tối đa 5MB mỗi ảnh, 10 ảnh mỗi lần.

## `src/app/product-images/product-images.module.ts`

- **ProductImagesModule › imports**: FileUtilModule: multer lưu file tạm vào MULTER_DESTINATION_FILE + FileStrategy (Cloudinary)

## `src/app/product-images/product-images.service.spec.ts`

- **files** (`{ path: 'uploads/images/b.jpg', originalname: 'anh.jpg' },`): cùng tên gốc
- **describe('ProductImagesService')**: ImageUploadService thật (bọc FileStrategy giả): kiểm tra luôn phần dùng chung

## `src/app/product-images/product-images.service.ts`

- **ProductImagesService › upload**: Upload lên Cloudinary rồi thêm vào cuối danh sách ảnh của product (tất cả hoặc không).
- **ProductImagesService › remove**: Bỏ ảnh khỏi product, rồi xóa trên Cloudinary (lỗi Cloudinary chỉ ghi log, không chặn).
