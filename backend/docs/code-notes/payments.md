# Module `payments` (src/app/payments)

## `src/app/payments/admin-payments.controller.ts`

- **AdminPaymentsController › findList**: Giao dịch SePay đã nhận. `?status=failed`: tiền đã vào nhưng không tự áp được vào đơn
  (sai số tiền, đơn đã hủy / đã trả) → đối soát, hoàn tiền hoặc POST /admin/orders/:id/mark-paid.

## `src/app/payments/dto/payment.dto.ts`

- **SepayWebhookDto**: Body webhook SePay (developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook).
  `.passthrough()`: SePay thêm field mới cũng không làm webhook lỗi. Field có thể rỗng / null.
- **SepayWebhookDto › id** (`id: z.number().int(),`): id giao dịch của SePay, không đổi khi gửi lại → khóa chống trùng
- **SepayWebhookDto › gateway** (`gateway: z.string().nullish(),`): tên ngân hàng
- **SepayWebhookDto › transactionDate** (`transactionDate: z.string().nullish(),`): "YYYY-MM-DD HH:mm:ss" giờ VN
- **SepayWebhookDto › code** (`code: z.string().nullish(),`): mã thanh toán SePay nhận diện được, null nếu không khớp cấu hình
- **SepayWebhookDto › content** (`content: z.string().nullish(),`): nội dung chuyển khoản gốc
- **PaymentListQueryDto**: GET /admin/payments: đối soát giao dịch, vd ?status=failed để xem tiền vào cần xử lý.

## `src/app/payments/payments.controller.ts`

- **PaymentsController**: Thông tin thanh toán đơn của người đang đăng nhập.
- **PaymentsController › getTransferInfo**: Thông tin chuyển khoản + QR của đơn chưa trả tiền (mở lại trang thanh toán).
  Frontend poll GET /me/orders/:orderNumber tới khi paymentStatus = "paid".

## `src/app/payments/payments.module.ts`

- **PaymentsModule**: Thanh toán chuyển khoản qua SePay (plan mục 12).
- **PaymentsModule › imports** (`imports: [OrdersModule],`): tìm đơn, đánh dấu đã trả tiền, gửi email
- **PaymentsModule › exports** (`exports: [PaymentsService],`): checkout lấy thông tin chuyển khoản

## `src/app/payments/payments.service.ts`

- **WebhookResult**: Kết quả xử lý 1 webhook. Mọi trường hợp đều trả { success: true } cho SePay.
- **NEEDS_ADMIN**: Giao dịch không tự áp được vào đơn: admin cần đối soát / hoàn tiền (GET /admin/payments?status=failed).
- **PaymentsService › assertTransferAvailable**: Gọi TRƯỚC khi tạo đơn bank_transfer: chưa cấu hình tài khoản nhận tiền thì không cho đặt.
- **PaymentsService › getMyTransferInfo**: GET /me/orders/:orderNumber/payment: chỉ đơn chuyển khoản đang chờ tiền.
- **PaymentsService › handleSepayWebhook**: Xử lý 1 giao dịch SePay báo về (chữ ký / API key đã được SepayWebhookGuard kiểm tra).
  Trong 1 transaction: tìm đơn → đối chiếu → lưu Payment (transactionID @unique chặn trùng)
  → khớp thì đánh dấu đơn đã trả tiền. Chỉ ném lỗi khi lỗi hệ thống (để SePay gửi lại).
- **PaymentsService › handleSepayWebhook › orderNumber**: `code` là mã SePay nhận diện theo cấu hình; không có thì tự tìm trong nội dung chuyển khoản
- **PaymentsService › handleSepayWebhook**: transactionID đã có: SePay gửi lại giao dịch đã xử lý → bỏ qua, vẫn báo thành công
- **PaymentsService › countFailed**: Dashboard: số giao dịch tiền vào không áp được vào đơn trong khoảng thời gian (cần đối soát).
  Đếm theo khoảng vì Payment "failed" không có trạng thái "đã xử lý".

## `src/app/payments/sepay-webhook.controller.spec.ts`

- **(đầu file)**: Webhook SePay qua HTTP thật: guard xác thực (HMAC-SHA256 hoặc API key) chạy TRƯỚC validate body,
  response đúng `{"success":true}` (SePay coi body khác là thất bại), lỗi hệ thống → 5xx để SePay gửi lại.
- **body › newFieldFromSepay** (`newFieldFromSepay: 'x',`): field mới SePay thêm sau này không làm webhook lỗi
- **RAW_BODY**: Body gốc có dấu tiếng Việt + khoảng trắng "lạ": parse rồi stringify lại sẽ ra chuỗi khác → chữ ký sai
- **describe('SepayWebhookController') › createApp › app**: rawBody giống main.ts (NEST_APP_OPTIONS), parser JSON mặc định cũng giữ body gốc
- **describe('SepayWebhookController') › describe('HMAC-SHA256 (SEPAY_WEBHOOK_SECRET)') › it('timestamp cũ hơn 5 phút (request bị phát lại) → 401 "hết hạn"')** (`expect(res.body.message).toMatch(/hết hạn/);`): app test không có CatchEverythingFilter → format mặc định

## `src/app/payments/sepay-webhook.controller.ts`

- **SepayWebhookController**: SePay gọi khi tài khoản nhận tiền có biến động. Không đăng nhập (xác thực bằng chữ ký HMAC hoặc API key),
  không giới hạn tần suất (SePay gửi lại tối đa 7 lần khi lỗi).
- **SepayWebhookController › webhook**: SePay chỉ coi là thành công khi HTTP 200 + đúng body `{ "success": true }`.
  Giao dịch bỏ qua / trùng vẫn trả thành công; lỗi hệ thống → 5xx để SePay gửi lại.
  Vì vậy không bọc qua format response chung.

## `src/app/payments/sepay-webhook.guard.ts`

- **SepayWebhookGuard**: Xác thực webhook SePay (developer.sepay.vn/vi/sepay-webhooks/xac-thuc), chọn theo env:
   - SEPAY_WEBHOOK_SECRET  → HMAC-SHA256 (SePay khuyến nghị): header X-SePay-Signature + X-SePay-Timestamp
   - SEPAY_WEBHOOK_API_KEY → API Key: header `Authorization: Apikey <key>`
  Đặt cả hai thì dùng HMAC. Guard chạy trước validate body: request không hợp lệ bị chặn sớm.
  HMAC cần body gốc: app phải tạo với `rawBody: true` (NEST_APP_OPTIONS).
- **SepayWebhookGuard › canActivate**: Chưa cấu hình: 503 để SePay gửi lại sau khi cấu hình xong, không âm thầm nhận mọi request

## `src/app/payments/sepay.util.spec.ts`

- **describe('sepay.util') › describe('evaluateTransfer') › it('đúng số tiền, đơn chưa trả → paid')** (`).toBe('paid');`): COD khách chuyển khoản trước
- **describe('sepay.util') › describe('verifySepaySignature') › now** (`const now = 1_763_000_000_000;`): ms
- **describe('sepay.util') › describe('verifySepaySignature') › signature**: Giá trị tính độc lập theo tài liệu SePay: HMAC-SHA256(secret, "<timestamp>.<raw body>"), hex

## `src/app/payments/sepay.util.ts`

- **VIETQR_IMAGE_URL**: Ảnh QR VietQR nhúng được (docs.sepay.vn/tao-qr-code-vietqr-dong.html).
- **SepayAccount › bank** (`bank: string;`): mã / tên ngân hàng, vd "VCB" hoặc "Vietcombank"
- **TransferInfo**: Thông tin để khách chuyển khoản (trả về khi checkout, GET /me/orders/:orderNumber/payment, email).
- **TransferInfo › content**: Nội dung chuyển khoản BẮT BUỘC: mã đơn bỏ dấu "-" để SePay nhận diện được.
- **TransferInfo › expiresAt**: Sau thời điểm này cron hủy đơn nếu chưa nhận được tiền.
- **TransferOutcome**: Kết quả đối chiếu 1 giao dịch tiền vào với đơn:
   - paid             khớp đúng số tiền, đơn chưa trả → đánh dấu đã thanh toán
   - amount_mismatch  chuyển thiếu / thừa → không tự xác nhận, admin xử lý
   - already_paid     đơn đã trả rồi (khách chuyển 2 lần) → admin hoàn tiền
   - order_closed     đơn đã hủy / trả hàng (vd tiền về sau khi cron hủy) → admin hoàn tiền
- **safeEqual**: So sánh chuỗi bí mật không lộ thông tin qua thời gian chạy (băm trước để 2 buffer cùng độ dài).
- **SIGNATURE_TOLERANCE_SECONDS**: SePay: timestamp lệch quá 5 phút thì từ chối (chống gửi lại request cũ bị bắt được).
- **verifySepaySignature**: Chữ ký HMAC-SHA256 của webhook SePay (developer.sepay.vn/vi/sepay-webhooks/xac-thuc):
  header `X-SePay-Signature: sha256=<hex>` = HMAC-SHA256(secret, "<X-SePay-Timestamp>.<raw body>").
  Phải ký trên BODY GỐC (bytes nhận được), không phải JSON đã parse rồi stringify lại.
