# Module `products` (src/app/products)

## `src/app/products/admin-collection-products.controller.ts`

- **AdminCollectionProductsController**: Nằm ở module products vì ghi vào Product.collectionIDs.
  Xem sản phẩm của bộ sưu tập: GET /admin/products?collectionID=

## `src/app/products/admin-products.controller.ts`

- **AdminProductsController › exportExcel**: Tải file Excel. Body { ids } để chỉ xuất một số sản phẩm; bỏ trống = xuất tất cả.
- **AdminProductsController › importExcel**: multipart/form-data, field "file" (.xlsx). Cùng định dạng với file export.

## `src/app/products/dto/export-products.dto.ts`

- **ExportProductsDto**: POST /admin/products/export. Không gửi body / ids rỗng = xuất tất cả.
- **ExportProductsDto**: .default({}): Express 5 để req.body = undefined khi request không có body

## `src/app/products/dto/product-query.dto.ts`

- **commaList**: "oak,rattan" → ["oak", "rattan"], mỗi giá trị phải nằm trong `values`.
- **ProductListQueryDto**: GET /products (plan mục 8). Ví dụ:
  ?category=sofa&room=living-room&style=japandi&material=oak,rattan&color=Xám
  &minPrice=1000000&maxPrice=20000000&inStock=true&q=sofa&sort=price_asc&page=1&itemPerPage=20
- **ProductListQueryDto › category** (`category: slugSchema.optional(),`): gồm cả danh mục con
- **ProductListQueryDto › collection** (`collection: slugSchema.optional(),`): slug bộ sưu tập đang hiển thị
- **ProductListQueryDto › material** (`material: commaList(MATERIALS).optional(),`): có ít nhất 1 chất liệu trong danh sách
- **ProductListQueryDto › color** (`color: z.string().trim().min(1).max(50).optional(),`): lấy từ GET /products/filters
- **ProductListQueryDto › q** (`q: z.string().trim().min(1).max(100).optional(),`): tìm theo tên
- **ProductLimitQueryDto**: GET /products/featured?limit=8 và GET /products/:slug/related?limit=8
- **ProductFiltersQueryDto**: GET /products/filters?category=den-tha&collection=ha-long
- **AdminProductListQueryDto**: GET /admin/products: thấy cả sản phẩm draft / inactive. q tìm theo tên hoặc SKU.

## `src/app/products/dto/product.dto.ts`

- **uniqueArray**: Mảng không trùng phần tử (gửi ["oak","oak"] → lưu ["oak"]).
- **productFields**: Các field của product mà admin được nhập (không gồm field tính tự động: minPrice, ratingAvg...).
- **productFields › description** (`description: z.string().max(20_000),`): HTML / markdown
- **productFields › assemblyFee** (`assemblyFee: money,`): VND / sản phẩm
- **productFields › allowBackorder** (`allowBackorder: z.boolean(),`): hàng đặt làm: cho đặt khi hết kho
- **CreateProductDto**: POST /admin/products: tạo product kèm ÍT NHẤT 1 variant.
  Không gửi slug thì tự sinh từ name.
- **CreateProductDto › status** (`status: productFields.status.optional(),`): mặc định draft
- **CreateProductDto › seen**: SKU không được trùng nhau ngay trong cùng request
- **CollectionProductsDto**: POST /admin/collections/:collectionID/products
- **UpdateProductDto**: PATCH /admin/products/:id: chỉ sửa thông tin product.
  Variant sửa qua /admin/products/:id/variants. Đổi name KHÔNG tự đổi slug.
- **UpdateProductDto › collectionIDs** (`collectionIDs: productFields.collectionIDs.optional(),`): gửi cả danh sách mới, [] = bỏ khỏi mọi bộ sưu tập

## `src/app/products/dto/variant-input.schema.ts`

- **money**: Dữ liệu 1 variant khi admin nhập. Dùng chung cho:
   - POST /admin/products (tạo product kèm variant)
   - module product-variants (thêm / sửa variant)
   - import Excel
- **money** (`const money = z.number().int().min(0);`): VND, không có số lẻ
- **variantOptionSchema › name** (`name: z.string().trim().min(1).max(50),`): "Màu", "Kích thước"
- **variantOptionSchema › value** (`value: z.string().trim().min(1).max(50),`): "Xám", "3 chỗ"
- **variantFieldsSchema**: Các field của variant, chưa có rule so sánh giữa các field (để còn .partial() khi sửa).
- **variantFieldsSchema › name** (`name: z.string().trim().min(1).max(150),`): "Sofa 3 chỗ - Xám"
- **variantFieldsSchema › compareAtPrice** (`compareAtPrice: money.nullable().optional(),`): giá gạch ngang
- **isValidCompareAtPrice**: Giá gạch ngang (nếu có) phải lớn hơn giá bán.
- **variantInputSchema**: Variant đầy đủ khi tạo mới.

## `src/app/products/excel/product-excel.mapper.spec.ts`

- **describe('groupRowsByProduct') › it('nhóm theo slug, không có slug thì theo name; báo dòng thiếu cả hai') › { groups, rowsWithoutProduct }** (`{ name: 'Sofa A', slug: 'sofa-a', sku: 'A1' },`): dòng 2
- **describe('groupRowsByProduct') › it('nhóm theo slug, không có slug thì theo name; báo dòng thiếu cả hai') › { groups, rowsWithoutProduct }** (`{ name: 'Sofa A', slug: 'sofa-a', sku: 'A2' },`): dòng 3
- **describe('groupRowsByProduct') › it('nhóm theo slug, không có slug thì theo name; báo dòng thiếu cả hai') › { groups, rowsWithoutProduct }** (`{ name: 'Đèn B', sku: 'B1' },`): dòng 4
- **describe('groupRowsByProduct') › it('nhóm theo slug, không có slug thì theo name; báo dòng thiếu cả hai') › { groups, rowsWithoutProduct }** (`{ sku: 'C1' },`): dòng 5
- **describe('groupRowsByProduct') › it('nhóm theo slug, không có slug thì theo name; báo dòng thiếu cả hai') › { groups, rowsWithoutProduct }** (`{ name: 'Đèn B', sku: 'B2' },`): dòng 6

## `src/app/products/excel/product-excel.mapper.ts`

- **(đầu file)**: Chuyển đổi giữa sản phẩm và dòng Excel. Mỗi dòng = 1 variant;
  các dòng cùng `slug` (hoặc cùng `name` nếu bỏ trống slug) là variant của cùng 1 sản phẩm.
  Các field của product chỉ đọc ở dòng ĐẦU TIÊN của nhóm.

  File chỉ có hàm thuần (không gọi DB) để dễ đọc và dễ test.
- **PRODUCT_EXCEL_COLUMNS**: Thứ tự cột trong file Excel. Header = startCase(tên cột), vd "variantName" → "Variant Name".
- **cellText**: Ô trống → undefined (để Zod dùng giá trị mặc định / báo thiếu).
- **cellNumber**: "abc" → NaN, để Zod báo lỗi "Expected number".
- **cellBoolean**: TRUE / true / 1 / x / yes / có → true; ô có giá trị khác → false.
- **cellList**: "oak, rattan" → ["oak", "rattan"]
- **cellOptions**: "Màu: Xám; Kích thước: 3 chỗ" → [{ name: "Màu", value: "Xám" }, { name: "Kích thước", value: "3 chỗ" }]
- **ProductRowGroup › rowNumbers**: Số dòng trong Excel (dòng 1 là header) để báo lỗi.
- **groupRowsByProduct**: Nhóm các dòng cùng slug (hoặc cùng name) thành 1 sản phẩm. Dòng không có name lẫn slug bị trả về riêng.
- **toCreateProductInput**: Dựng dữ liệu tạo sản phẩm (chưa validate) từ 1 nhóm dòng.
  Kết quả đưa qua CreateProductDto.schema để kiểm tra như khi gọi API.

## `src/app/products/excel/products-excel.const.ts`

- **EXCEL_UPLOAD_OPTIONS**: Chỉ nhận file .xlsx, tối đa 5MB.

## `src/app/products/excel/products-excel.service.spec.ts`

- **describe('ProductsExcelService') › describe('import') › it('tạo từng sản phẩm, gom variant theo tên; báo lỗi theo số dòng; luôn xóa file tạm') › Products** (`row('Sofa A', 'A1'),`): dòng 2
- **describe('ProductsExcelService') › describe('import') › it('tạo từng sản phẩm, gom variant theo tên; báo lỗi theo số dòng; luôn xóa file tạm') › Products** (`row('Sofa A', 'A2'),`): dòng 3
- **describe('ProductsExcelService') › describe('import') › it('tạo từng sản phẩm, gom variant theo tên; báo lỗi theo số dòng; luôn xóa file tạm') › Products** (`row('Đèn B', 'B1', { categorySlug: 'khong-co' }),`): dòng 4: sai danh mục
- **describe('ProductsExcelService') › describe('import') › it('tạo từng sản phẩm, gom variant theo tên; báo lỗi theo số dòng; luôn xóa file tạm') › Products** (`row('Kệ C', 'C1', { price: 'abc' }),`): dòng 5: sai giá
- **describe('ProductsExcelService') › describe('import') › it('tạo từng sản phẩm, gom variant theo tên; báo lỗi theo số dòng; luôn xóa file tạm') › Products** (`row('Gương D', 'D1'),`): dòng 6: SKU trùng DB
- **describe('ProductsExcelService') › describe('import') › it('tạo từng sản phẩm, gom variant theo tên; báo lỗi theo số dòng; luôn xóa file tạm')** (`expect(products.create).toHaveBeenCalledTimes(2);`): Sofa A + Gương D
- **describe('ProductsExcelService') › describe('import') › it('BUG-04: sản phẩm "active" mà mọi variant đều tắt → nằm trong errors đúng các dòng, không trong created') › productModel**: Dùng ProductsService thật (prisma mock) để chạy đúng rule của create()
- **describe('ProductsExcelService') › describe('import') › it('BUG-04: sản phẩm "active" mà mọi variant đều tắt → nằm trong errors đúng các dòng, không trong created') › Products** (`row('Sofa A', 'A1', { status: 'active', variantActive: false }),`): dòng 2
- **describe('ProductsExcelService') › describe('import') › it('BUG-04: sản phẩm "active" mà mọi variant đều tắt → nằm trong errors đúng các dòng, không trong created') › Products** (`row('Sofa A', 'A2', { status: 'active', variantActive: false }),`): dòng 3
- **describe('ProductsExcelService') › describe('import') › it('BUG-04: sản phẩm "active" mà mọi variant đều tắt → nằm trong errors đúng các dòng, không trong created') › Products** (`row('Kệ B', 'B1', { status: 'active' }),`): dòng 4: hợp lệ

## `src/app/products/excel/products-excel.service.ts`

- **ProductsExcelService › export**: Xuất sản phẩm (theo ids, hoặc tất cả) ra Excel, mỗi variant 1 dòng.
- **ProductsExcelService › export › worksheets › fieldsExtend** (`fieldsExtend: [...PRODUCT_EXCEL_COLUMNS],`): không có dữ liệu vẫn có header (làm file mẫu)
- **ProductsExcelService › import**: Nhập sản phẩm MỚI từ Excel. Mỗi sản phẩm được validate và tạo giống hệt
  POST /admin/products (qua ProductsService.create). Sản phẩm lỗi được bỏ qua
  và báo lại số dòng, các sản phẩm khác vẫn được tạo.
- **ProductsExcelService › importRows**: Tạo lần lượt từng sản phẩm (không song song) để slug tự sinh không đụng nhau

## `src/app/products/product-filter.ts`

- **buildPublicProductWhere**: Điều kiện lọc sản phẩm cho trang danh sách (plan mục 8).
  Mỗi bộ lọc là một điều kiện trong AND, nên đọc từ trên xuống là thấy đủ.

  @param categoryIDs ID danh mục + con cháu (undefined = không lọc theo danh mục)
  @param collectionID ID bộ sưu tập (undefined = không lọc theo bộ sưu tập)
- **buildPublicProductWhere › conditions** (`{ status: ProductStatus.active },`): khách chỉ thấy sản phẩm đang bán
- **buildPublicProductWhere**: Lọc theo giá thấp nhất của sản phẩm (giá "từ ...")
- **buildPublicProductWhere**: Prisma không có full-text search trên MongoDB: dùng regex không phân biệt hoa thường
- **buildPublicProductWhere**: Còn hàng = hàng đặt làm (luôn cho đặt) HOẶC có variant đang bán còn tồn kho
- **PRODUCT_ORDER_BY**: Cách sắp xếp. Luôn có `id` cuối cùng để phân trang ổn định khi giá trị bằng nhau.

## `src/app/products/product-summary.spec.ts`

- **describe('computeProductSummary') › it('colors: lấy option tên "Màu" / "Màu sắc" / "Color", không trùng, không phân biệt hoa thường') › summary** (`variant(1, [{ name: 'Color', value: 'xám' }]),`): trùng "Xám"

## `src/app/products/product-summary.ts`

- **normalize**: "Màu sắc" → "mau-sac", để so với COLOR_OPTION_NAMES.
- **computeProductSummary**: Các field lưu thừa trên Product để lọc / sắp xếp mà không phải join variant:
   - minPrice / maxPrice: giá thấp nhất / cao nhất của variant đang bán (0 nếu không có)
   - colors: các giá trị option "Màu" của variant đang bán, không trùng (không phân biệt hoa thường)

  Phải gọi lại mỗi khi tạo / sửa / xóa variant.

## `src/app/products/products.controller.ts`

- **ProductsController**: Lưu ý thứ tự route: "featured" và "filters" phải khai báo TRƯỚC ":slug",
  nếu không Express sẽ hiểu "featured" là một slug.

## `src/app/products/products.module.ts`

- **ProductsModule › imports** (`FileUtilModule,`): multer lưu file Excel tạm ra đĩa để import
- **ProductsModule › controllers** (`AdminCollectionProductsController,`): gán / gỡ sản phẩm khỏi bộ sưu tập (ghi Product.collectionIDs)
- **ProductsModule › exports** (`exports: [ProductsService],`): product-variants, product-images, wishlist, cart, checkout dùng

## `src/app/products/products.service.spec.ts`

- **describe('ProductsService')**: $transaction([...]) chạy các thao tác; $transaction(fn) gọi fn với tx = chính mock này
- **describe('ProductsService') › describe('bộ sưu tập') › it('addToCollection: push có điều kiện chưa có ID, bỏ qua sản phẩm đã xóa') › where › OR** (`OR: expect.any(Array),`): NOT_DELETED
- **describe('ProductsService') › describe('create')** (`variant.findMany.mockResolvedValue([]);`): chưa có SKU nào trùng
- **describe('ProductsService') › describe('create')** (`product.findMany.mockResolvedValue([]);`): chưa có slug nào trùng
- **describe('ProductsService') › describe('update') › it('đổi sang slug khác: kiểm tra slug mới; trùng sản phẩm khác → 409')** (`.mockResolvedValueOnce(current(1))`): sản phẩm đang sửa
- **describe('ProductsService') › describe('update') › it('đổi sang slug khác: kiểm tra slug mới; trùng sản phẩm khác → 409')** (`.mockResolvedValueOnce({ id: 'other' });`): slug mới đã thuộc sản phẩm khác
- **describe('ProductsService') › describe('dùng cho module khác') › variants** (`{ price: 3_000, isActive: false, options: [] },`): đang tắt → không tính
- **describe('ProductsService') › describe('dùng cho module khác') › it('BUG-08: ghi ảnh bị xung đột (P2034) thì đọc lại và chạy lại')**: Lần 2 đọc thấy ảnh vừa upload xong → không bị ghi đè mất

## `src/app/products/products.service.ts`

- **RESERVED_SLUGS**: Slug trùng đường dẫn tĩnh /products/featured, /products/filters → không được dùng.
- **PRODUCT_CARD_SELECT**: Thông tin hiển thị trên thẻ sản phẩm ở trang danh sách.
- **PUBLIC_VARIANT_SELECT**: Variant khách được thấy ở trang chi tiết.
- **RecalculateOptions › tx**: Client của transaction đang chạy (mặc định: client gốc).
- **assertCanBeActive**: Sản phẩm "active" (hiện cho khách) phải có ít nhất 1 variant đang bán.
- **ProductsService › findPublicList**: GET /products: lọc + sắp xếp + phân trang (plan mục 8).
- **ProductsService › findPublicList** (`if (!scope) return emptyPage();`): danh mục / bộ sưu tập không tồn tại hoặc đang ẩn
- **ProductsService › findPublicList › [list, totalItems]** (`this.extended.count({ where }),`): PHẢI dùng cùng where với findMany
- **ProductsService › findFeatured**: GET /products/featured
- **ProductsService › getFilterOptions**: GET /products/filters: các giá trị lọc đang có sản phẩm, để frontend dựng bộ lọc.
  Đọc field lọc của mọi sản phẩm đang bán rồi gộp lại (đủ nhanh với vài nghìn sản phẩm).
- **ProductsService › getFilterOptions › rooms**: giữ thứ tự như trong hằng số
- **ProductsService › findPublicBySlug**: GET /products/:slug: chi tiết kèm danh mục, các bộ sưu tập đang hiển thị
  và các variant đang bán (giá tăng dần).
- **ProductsService › findRelated**: GET /products/:slug/related: cùng danh mục HOẶC cùng phong cách, bán chạy trước.
- **ProductsService › findAdminList**: GET /admin/products: thấy cả draft / inactive, tìm theo tên hoặc SKU.
- **ProductsService › findAdminByID**: GET /admin/products/:id: đầy đủ, gồm cả variant đang tắt.
  collectionIDs chỉ giữ bộ sưu tập chưa xóa, để form sửa gửi lại không bị 404.
- **ProductsService › create**: POST /admin/products: tạo product và các variant trong 1 lần ghi
  (nested create, Prisma tự chạy trong transaction).
- **ProductsService › create › data** (`...computeProductSummary(variants),`): minPrice, maxPrice, colors
- **ProductsService › update**: PATCH /admin/products/:id
- **ProductsService › remove**: DELETE /admin/products/:id: soft delete product và mọi variant của nó.
  Đổi slug / SKU thành "...--deleted-<id>" để giải phóng (index @unique tính cả bản ghi đã xóa).
  Đơn hàng cũ không bị ảnh hưởng vì đơn lưu snapshot.

  CỐ Ý giữ ảnh trên Cloudinary: soft delete còn khôi phục được, và đơn hàng cũ (snapshot)
  vẫn trỏ tới imageUrl. Nếu sau này có xóa cứng thì phải xóa ảnh (images[].publicID) ở bước đó.
- **ProductsService › addToCollection**: POST /admin/collections/:collectionID/products: thêm sản phẩm vào bộ sưu tập.
  `push` có điều kiện "chưa có ID này" → atomic, gọi lại nhiều lần không bị trùng.
- **ProductsService › removeFromCollection**: DELETE /admin/collections/:collectionID/products/:productID: gỡ sản phẩm khỏi bộ sưu tập.
  Prisma không có `pull` cho mảng → đọc - sửa - ghi trong transaction (xung đột thì chạy lại).
  Không kiểm tra bộ sưu tập còn tồn tại để gỡ được cả ID của bộ sưu tập đã xóa.
- **ProductsService › findOneOrThrow**: Product chưa xóa (mọi trạng thái), ném 404 nếu không có.
- **ProductsService › ensureActive**: Ném 404 nếu sản phẩm không tồn tại hoặc không đang bán.
- **ProductsService › findCardsByIDs**: Thẻ sản phẩm đang bán theo danh sách ID (wishlist).
- **ProductsService › recalculateSummary**: Tính lại minPrice / maxPrice / colors từ variant hiện có.
  PHẢI gọi sau mỗi lần tạo / sửa / xóa variant, trong CÙNG transaction với lần ghi variant.

  Hàm luôn ghi vào document product, nên 2 transaction sửa variant của cùng product sẽ
  xung đột (P2034) và bị chạy lại tuần tự: summary luôn đúng, và kiểm tra `ensureSelling`
  không bị lọt khi 2 admin cùng tắt 2 variant cuối (write skew).

  @param ensureSelling ném 409 nếu product đang "active" mà không còn variant đang bán
- **ProductsService › addSoldCount**: Cộng (hoặc trừ khi quantity âm) lượt bán `soldCount` theo các dòng đơn hàng.
  Dùng client gốc trong tx: product đã xóa vẫn được cập nhật cho đúng thống kê.
- **ProductsService › setRating**: Lưu điểm đánh giá (lưu thừa để lọc / sắp xếp "rating" không phải join review).
  Reviews gọi trong transaction mỗi khi review thêm / sửa / xóa / đổi trạng thái.
- **ProductsService › appendImages**: Thêm ảnh vào cuối danh sách ảnh của product. Trả về danh sách ảnh mới.
- **ProductsService › appendImages**: Transaction: 2 lần upload song song không bị trùng sortOrder (lần sau xung đột và chạy lại)
- **ProductsService › removeImage**: Bỏ 1 ảnh khỏi product theo publicID (Cloudinary). Trả về danh sách ảnh còn lại.
- **ProductsService › removeImage**: Transaction: ảnh vừa upload xong trong lúc đang xóa không bị `set` ghi đè mất
- **ProductsService › resolveScope**: Đổi slug danh mục / bộ sưu tập trên query thành ID để lọc.
  null = có slug nhưng không tồn tại hoặc đang ẩn → kết quả rỗng.
- **ProductsService › updateImages**: Đọc - sửa - ghi lại cả mảng ảnh trong 1 transaction (Prisma không có `pull` cho composite list).
  Request khác ghi chen vào giữa → xung đột P2034 → withRetry chạy lại với dữ liệu mới.
- **ProductsService › assertSlugAvailable**: Dùng client gốc vì index @unique của slug tính cả bản ghi đã xóa.

## `src/app/products/variant-sku.ts`

- **assertSkusAvailable**: Ném 409 nếu có SKU đã tồn tại. Dùng client gốc vì index @unique của SKU
  tính cả variant đã xóa (variant xóa đã được đổi SKU thành "...--deleted-<id>").
