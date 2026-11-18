# Module `product-variants` (src/app/product-variants)

## `src/app/product-variants/dto/variant.dto.ts`

- **CreateVariantDto**: POST /admin/products/:productID/variants
- **UpdateVariantDto**: PATCH /admin/products/:productID/variants/:variantID
  Không sửa tồn kho ở đây: tồn kho đổi qua PATCH /admin/variants/:variantID/stock.
  Rule "giá gạch ngang > giá bán" kiểm tra trong service (cần giá trị hiện tại).
- **UpdateStockDto**: PATCH /admin/variants/:variantID/stock
   - { "stock": 20 }   đặt tồn kho = 20 (kiểm kê)
   - { "adjust": -3 }  trừ 3 / { "adjust": 5 } cộng 5 (nhập / xuất kho)

## `src/app/product-variants/product-variants.controller.spec.ts`

- **describe('DTO variant') › it('UpdateVariantDto: field không gửi KHÔNG bị gán giá trị mặc định (không ghi đè dữ liệu cũ)')** (`expect(result).toEqual({ price: 1_000_000 });`): không có isActive: true, options: [], weightKg: 0

## `src/app/product-variants/product-variants.service.spec.ts`

- **describe('ProductVariantsService') › expectRecalculated**: recalculateSummary được gọi trong transaction (tx = mock prisma), với ensureSelling tương ứng.
- **describe('ProductVariantsService') › describe('create') › it('tạo variant rồi tính lại giá / màu của product trong cùng transaction')** (`variant.findMany.mockResolvedValue([]);`): SKU chưa có
- **describe('ProductVariantsService') › describe('update') › it('BUG-08: 2 admin cùng tắt 2 variant cuối → transaction sau xung đột (P2034), chạy lại thì nhận 409')** (`.mockRejectedValueOnce(conflict)`): lần 1: document product đã bị transaction kia ghi
- **describe('ProductVariantsService') › describe('update') › it('BUG-08: 2 admin cùng tắt 2 variant cuối → transaction sau xung đột (P2034), chạy lại thì nhận 409')** (`.mockRejectedValueOnce(new ConflictException());`): lần 2: đọc lại thấy không còn variant đang bán

## `src/app/product-variants/product-variants.service.ts`

- **SALE_VARIANT_SELECT**: Field của variant + product cần cho giỏ hàng, checkout và snapshot đơn hàng.
- **StockLine › name** (`name: string;`): để báo lỗi "... không đủ hàng"
- **ProductVariantsService**: Quy tắc:
   - Sau mỗi lần tạo / sửa / xóa variant → tính lại minPrice, maxPrice, colors của product
     (trong cùng transaction, xem `writeAndRecalculate`).
   - Sản phẩm đang "active" luôn phải còn ít nhất 1 variant đang bán.
- **ProductVariantsService › findByProduct**: Mọi variant chưa xóa của product (cả variant đang tắt).
- **ProductVariantsService › remove**: Soft delete, đổi SKU thành "...--deleted-<id>" để giải phóng SKU.
- **ProductVariantsService › updateStock**: Đặt tồn kho ({ stock }) hoặc cộng / trừ ({ adjust }).
  Trừ kho là atomic: chỉ trừ khi còn đủ, 2 admin trừ cùng lúc cũng không âm kho.
- **ProductVariantsService › updateStock › adjust** (`const adjust = dto.adjust!;`): DTO bảo đảm có đúng 1 trong 2
- **ProductVariantsService › updateStock › result › where** (`...(adjust < 0 && { stock: { gte: -adjust } }),`): chỉ trừ khi còn đủ
- **ProductVariantsService › findForSale**: Variant chưa xóa (cả variant đang tắt) kèm thông tin product cần để bán.
  Bên gọi tự quyết định variant có mua được không (xem `getSaleStatus` trong carts).
- **ProductVariantsService › reserveStock**: Trừ kho ATOMIC từng dòng: chỉ trừ khi còn đủ (2 đơn cùng lúc không làm âm kho).
  Không đủ hàng thì 409, transaction của checkout rollback toàn bộ.
- **ProductVariantsService › restoreStock**: Hoàn kho khi hủy đơn (kể cả variant đã bị xóa sau khi đặt).
- **ProductVariantsService › findLowStock**: Dashboard: variant đang bán sắp hết hàng (stock <= threshold), ít hàng nhất trước.
  Bỏ qua hàng đặt làm (allowBackorder) vì hết kho vẫn bán được.
- **ProductVariantsService › writeAndRecalculate**: Ghi variant rồi tính lại summary của product trong CÙNG 1 transaction.
  Lần ghi summary vào document product làm 2 request song song trên cùng product
  xung đột (P2034) → withRetry chạy lại request sau với dữ liệu mới. Nhờ vậy 2 admin
  cùng tắt 2 variant cuối thì chỉ 1 người thành công, người còn lại nhận 409.

  @param reducesSelling lần ghi làm giảm số variant đang bán (tắt / xóa variant đang bán)
