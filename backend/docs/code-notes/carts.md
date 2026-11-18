# Module `carts` (src/app/carts)

## `src/app/carts/carts.controller.ts`

- **CartsController**: Giỏ hàng của người đang đăng nhập. Mọi API trả về giỏ hàng mới nhất.

## `src/app/carts/carts.module.ts`

- **CartsModule › imports** (`imports: [ProductVariantsModule],`): đọc giá / tồn kho hiện tại của variant
- **CartsModule › exports** (`exports: [CartsService],`): checkout đọc và xóa giỏ trong transaction

## `src/app/carts/carts.service.spec.ts`

- **describe('CartsService') › stored**: Giỏ "trong DB": upsert ghi vào đây, findUnique đọc ra.

## `src/app/carts/carts.service.ts`

- **CartsService**: Giỏ hàng: 1 document / user, chỉ lưu variantID + số lượng. Giá, tồn kho, trạng thái
  luôn đọc lại từ DB khi xem giỏ (không lưu giá vào giỏ, không tin giá từ client).
- **CartsService › getCart**: GET /me/cart: kèm giá, tồn kho hiện tại và trạng thái từng dòng. Mới thêm hiện trước.
- **CartsService › getCart › subtotal** (`subtotal: purchasable.reduce((sum, l) => sum + l.lineTotal, 0),`): chỉ tính dòng mua được
- **CartsService › removeItem**: Xóa 1 dòng (không có trong giỏ cũng trả về giỏ hiện tại).
- **CartsService › mutateItems**: Đọc - sửa - ghi lại cả mảng items trong transaction (Prisma không có `pull` cho composite list).
  2 request sửa giỏ cùng lúc → xung đột P2034 → chạy lại, không ghi đè mất thay đổi.
- **assertQuantity**: Không cho vượt tồn kho (trừ hàng đặt làm) và giới hạn số lượng mỗi dòng.

## `src/app/carts/dto/cart.dto.ts`

- **AddCartItemDto**: POST /me/cart/items: đã có trong giỏ thì cộng dồn số lượng.
- **UpdateCartItemDto**: PATCH /me/cart/items/:variantID: đặt lại số lượng.

## `src/app/carts/sale-status.ts`

- **SaleStatus**: Trạng thái mua của 1 dòng giỏ hàng, tính lại mỗi lần đọc (giá / tồn kho có thể đã đổi):
   - available           đủ hàng
   - made_to_order       hàng đặt làm (allowBackorder) không đủ kho: vẫn đặt được, giao sau leadTimeDays
   - insufficient_stock  còn hàng nhưng không đủ số lượng
   - out_of_stock        hết hàng
   - unavailable         variant / sản phẩm đã ngừng bán hoặc bị xóa
- **pickImageUrl**: Ảnh hiển thị: ảnh đầu của variant, không có thì ảnh đầu của product.
