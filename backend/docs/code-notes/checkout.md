# Module `checkout` (src/app/checkout)

## `src/app/checkout/checkout-lines.ts`

- **CheckoutLine › reserveStock**: true: có sẵn hàng → trừ kho. false: hàng đặt làm không đủ kho → không trừ, cộng leadTimeDays.
- **buildCheckoutLines**: Dựng các dòng của đơn từ giỏ hàng + dữ liệu variant ĐỌC TỪ DB (giá luôn lấy từ DB).
  Có dòng không mua được thì báo lỗi cho cả đơn để khách sửa giỏ trước.

## `src/app/checkout/checkout.controller.ts`

- **CheckoutController**: Đặt hàng từ giỏ hàng của người đang đăng nhập.
- **CheckoutController › preview**: Bảng tính tiền (tạm tính, phí ship, lắp đặt, giảm giá, tổng), không ghi DB.
- **CheckoutController › checkout**: Tạo đơn. Chuyển khoản (bank_transfer) trả kèm `payment`: thông tin chuyển khoản + QR; COD thì null.

## `src/app/checkout/checkout.module.ts`

- **CheckoutModule**: Không có collection riêng: điều phối các module khác qua service (chung 1 transaction).
- **CheckoutModule › imports** (`OrdersModule,`): tạo đơn + email đặt hàng
- **CheckoutModule › imports** (`PaymentsModule,`): thông tin chuyển khoản SePay

## `src/app/checkout/checkout.service.spec.ts`

- **lamp**: 2 × đèn 1.5tr (2kg, có sẵn) + 1 × sofa đặt làm 12tr (hết kho, cần lắp 500k, sản xuất 14 ngày)
- **describe('CheckoutService')** (`jest.resetAllMocks();`): xóa cả implementation / hàng đợi "Once" của test trước
- **describe('CheckoutService') › SUBTOTAL**: subtotal = 3.000.000 + 12.000.000; 2×2 + 3 = 7kg → 2kg thêm → ship 40.000
- **describe('CheckoutService') › describe('preview') › it('có mã giảm giá: kiểm tra mã với subtotal, đếm lượt dùng của CHÍNH user')** (`expect(result.discount).toBe(500_000);`): 10% của 15tr = 1.5tr, trần 500k
- **describe('CheckoutService') › describe('checkout') › it('đơn là snapshot: tên, sku, giá, ảnh, địa chỉ, tiền tại lúc đặt')** (`expect(payment).toBeNull();`): COD: không cần thông tin chuyển khoản

## `src/app/checkout/checkout.service.ts`

- **CHECKOUT_TX_OPTIONS**: Transaction checkout gồm khoảng 10 + số dòng truy vấn. Atlas ở xa có thể 100–200ms / truy vấn,
  nên nới timeout mặc định (5s) của Prisma.
- **toShippingAddress**: Không trả nguyên document địa chỉ ra ngoài, chỉ các field giao hàng.
- **CheckoutService › preview**: POST /checkout/preview: bảng tính tiền giống hệt lúc đặt, không ghi DB.
- **CheckoutService › checkout**: POST /checkout (plan mục 10). Toàn bộ chạy trong 1 transaction:
  đọc giỏ → đọc variant + product từ DB → địa chỉ của user → kiểm tra trạng thái / tồn kho →
  tính tiền → trừ kho (atomic) → tăng lượt dùng mã (atomic) → tạo đơn (snapshot) → xóa giỏ.

  Xóa giỏ ghi vào document cart, nên 2 lần bấm "Đặt hàng" cùng lúc sẽ xung đột: lần sau
  chạy lại, thấy giỏ trống và bị từ chối (không tạo 2 đơn, không vượt perUserLimit).
- **CheckoutService › checkout**: Kiểm tra trước khi tạo đơn: không để đơn chuyển khoản được tạo mà không có thông tin nhận tiền
- **CheckoutService › checkout › payment**: Ngoài transaction (đơn đã commit): thông tin chuyển khoản + QR, email xác nhận chạy nền
- **CheckoutService › quote**: Tính tiền ở server, từ dữ liệu trong DB (không tin giá từ client).
  total = subtotal + shippingFee + assemblyFee − discount
  (mã free_shipping: discount = shippingFee, nên đơn vẫn lưu phí ship thật để đối soát).

## `src/app/checkout/dto/checkout.dto.ts`

- **SUPPORTED_PAYMENT_METHODS**: COD hoặc chuyển khoản VietQR, SePay xác nhận qua webhook (plan mục 12).
- **fields › addressID** (`addressID: objectId,`): địa chỉ trong sổ địa chỉ của chính user
- **fields › promotionCode**: FE gửi "" khi ô mã trống → coi như không có mã
- **fields › withAssembly** (`withAssembly: z.boolean().default(false),`): lắp đặt cho các sản phẩm requiresAssembly
- **CheckoutPreviewDto**: POST /checkout/preview: tính tiền, không ghi DB.
- **CheckoutDto**: POST /checkout
- **CheckoutDto › note** (`note: z.string().trim().max(500).optional(),`): ghi chú cho shop
