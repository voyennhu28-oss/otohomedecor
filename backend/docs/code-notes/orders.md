# Module `orders` (src/app/orders)

## `src/app/orders/admin-orders.controller.ts`

- **AdminOrdersController › findList**: Lọc theo trạng thái, khoảng ngày, mã đơn, email, phương thức / trạng thái thanh toán.
- **AdminOrdersController › exportExcel**: Tải file Excel, body là bộ lọc giống GET /admin/orders (bỏ trống = tất cả).
- **AdminOrdersController › updateStatus**: Chỉ cho bước chuyển hợp lệ (plan mục 11). Hủy đơn: hoàn kho + trả lượt mã giảm giá.
- **AdminOrdersController › markPaid**: Xác nhận đã nhận chuyển khoản thủ công: khách ghi sai nội dung, chuyển nhiều lần...
  (đối soát ở GET /admin/payments?status=failed). Đơn chờ xác nhận → "Đã xác nhận".

## `src/app/orders/dto/order.dto.spec.ts`

- **describe('Order DTO') › it('mã đơn: viết hoa, đúng định dạng')** (`).toBe(false);`): không có số 0

## `src/app/orders/dto/order.dto.ts`

- **MyOrderListQueryDto**: GET /me/orders?status=&page=&itemPerPage=
- **CancelOrderDto**: POST /me/orders/:orderNumber/cancel
- **CancelOrderDto**: .default({}): Express 5 để req.body = undefined khi không gửi body
- **adminOrderFilter**: Bộ lọc đơn của admin, dùng chung cho danh sách và export Excel.
- **adminOrderFilter › from** (`from: vnDay('start').optional(),`): ngày đặt từ
- **adminOrderFilter › to** (`to: vnDay('end').optional(),`): ngày đặt đến (gồm cả ngày đó)
- **adminOrderFilter › orderNumber** (`orderNumber: searchQuery.optional(),`): tìm 1 phần mã đơn
- **adminOrderFilter › email** (`email: searchQuery.optional(),`): tìm 1 phần email khách
- **AdminOrderListQueryDto**: GET /admin/orders
- **ExportOrdersDto**: POST /admin/orders/export: cùng bộ lọc với danh sách (body), không phân trang.
- **MarkPaidDto**: POST /admin/orders/:id/mark-paid: admin xác nhận đã nhận tiền (SePay không tự khớp được).
- **UpdateOrderStatusDto**: PATCH /admin/orders/:id/status. `note` lưu vào lịch sử; hủy đơn thì là lý do hủy.

## `src/app/orders/order-excel.ts`

- **toOrderExcelRows**: Mỗi đơn 1 dòng; các sản phẩm gộp thành "SKU x số lượng; ...".

## `src/app/orders/order-mail.ts`

- **MailContext › orderUrl** (`orderUrl: string;`): trang chi tiết đơn trên frontend
- **orderSummary**: Bảng sản phẩm + tiền.
- **buildOrderPlacedEmail**: Email xác nhận đặt hàng (gửi ngay sau checkout).
- **statusContent**: Nội dung theo trạng thái; null = trạng thái này không gửi email (pending, processing).
- **buildStatusEmail**: Email khi đơn đổi trạng thái (gồm cả khi SePay báo đã nhận tiền).

## `src/app/orders/order-notification.service.ts`

- **OrderNotificationService**: Email cho khách về đơn hàng (Brevo SMTP qua MailUtilService). Mọi hàm public chạy NỀN:
  không chặn response, lỗi chỉ ghi log. Luôn gọi SAU khi transaction đã commit.
- **OrderNotificationService › orderPlaced**: Sau checkout. `transfer` = thông tin chuyển khoản nếu đơn bank_transfer.
- **OrderNotificationService › statusChanged**: Sau khi đơn đổi trạng thái. Trạng thái không cần báo (processing...) thì không gửi.
- **OrderNotificationService › send › order**: Đọc lại đơn đã commit (kèm email khách qua quan hệ user, không truy vấn thẳng module users)

## `src/app/orders/order-number.ts`

- **ALPHABET**: Bỏ 0/O, 1/I dễ đọc nhầm khi khách đọc mã đơn qua điện thoại.
- **toPaymentCode**: Nội dung chuyển khoản (SePay): mã đơn bỏ dấu "-", vd "HD261113-7K3M9Q" → "HD2611137K3M9Q".
  SePay chỉ nhận diện mã dạng tiền tố + chữ/số (cấu hình: tiền tố HD, hậu tố 12 ký tự số và chữ),
  còn VietQR / ngân hàng tự bỏ ký tự đặc biệt khỏi nội dung chuyển khoản.
- **findOrderNumberInText**: Tìm mã đơn trong mã thanh toán SePay nhận diện được (`code`) hoặc nội dung chuyển khoản
  (`content`, khách có thể gõ thêm chữ, dấu cách, viết thường). Trả về mã đơn có dấu "-" hoặc null.

## `src/app/orders/order-status.spec.ts`

- **describe('generateOrderNumber') › it('HD + ngày theo giờ Việt Nam + 6 ký tự dễ đọc') › number**: 2026-11-13 18:30 UTC = 2026-11-14 01:30 giờ VN
- **describe('mã thanh toán SePay') › it('findOrderNumberInText: đọc lại mã đơn từ code / nội dung chuyển khoản')**: ngân hàng thêm tiền tố, khách gõ thường / có khoảng trắng / còn giữ dấu "-"
- **describe('mã thanh toán SePay') › it('findOrderNumberInText: không có mã hợp lệ → null')** (`expect(findOrderNumberInText('HD2611137K3M90')).toBeNull();`): số 0 không có trong bảng ký tự

## `src/app/orders/order-status.ts`

- **ORDER_TRANSITIONS**: Bước chuyển hợp lệ (plan mục 11):
    pending ──► confirmed ──► processing ──► shipping ──► delivered ──► returned
       └────────────┴──► cancelled
- **CUSTOMER_CANCELLABLE**: Customer chỉ tự hủy được đơn chưa xác nhận.
- **statusTimestamp**: Mốc thời gian set khi chuyển sang trạng thái tương ứng.

## `src/app/orders/orders.controller.ts`

- **OrdersController**: Đơn hàng của người đang đăng nhập. userID luôn lấy từ token.
- **OrdersController › cancel**: Chỉ hủy được khi đơn còn "Chờ xác nhận".

## `src/app/orders/orders.cron.ts`

- **OrdersCron › cancelUnpaidOrders**: Mỗi 5 phút: hủy đơn chuyển khoản (SePay) chưa nhận tiền quá ORDER_UNPAID_TIMEOUT_MINUTES.
  Chạy nhiều instance cùng lúc vẫn an toàn: mỗi đơn hủy trong transaction, lần thứ 2 bị từ chối.
- **OrdersCron › cancelUnpaidOrders** (`if (this.running) return;`): lần trước chưa xong (DB chậm) thì bỏ qua lần này

## `src/app/orders/orders.module.ts`

- **OrdersModule › imports** (`ProductVariantsModule,`): hoàn kho khi hủy
- **OrdersModule › imports** (`ProductsModule,`): cộng / trừ soldCount
- **OrdersModule › imports** (`PromotionsModule,`): trả lượt mã khi hủy
- **OrdersModule › imports** (`MailUtilModule,`): email đơn hàng (Brevo)
- **OrdersModule › exports**: checkout tạo đơn + gửi email đặt hàng; payments đánh dấu đã trả tiền; users tính tổng chi tiêu

## `src/app/orders/orders.service.spec.ts`

- **items** (`},`): hàng đặt làm
- **describe('OrdersService')** (`jest.resetAllMocks();`): xóa cả implementation / hàng đợi "Once" của test trước
- **describe('OrdersService') › updated**: data của lần tx.order.update cuối cùng
- **describe('OrdersService') › describe('admin đổi trạng thái') › it('hủy: hoàn kho CHỈ dòng đã trừ kho, trả lượt mã, lưu lý do — trong cùng transaction')** (`expect(updated().paymentStatus).toBeUndefined();`): chưa trả tiền
- **describe('OrdersService') › describe('admin đổi trạng thái') › it('2 admin cùng hủy: lần sau xung đột (P2034), chạy lại thấy đã hủy → 400, chỉ hoàn kho 1 lần')**: lần 1 bị rollback cùng transaction; lần 2 không chạy tới bước hoàn kho
- **describe('OrdersService') › describe('cron: hủy đơn chuyển khoản quá hạn') › it('hủy từng đơn: hoàn kho, ghi "system"; đơn vừa được thanh toán thì bỏ qua')** (`.mockResolvedValueOnce(storedOrder())`): o1: vẫn chờ tiền
- **describe('OrdersService') › describe('cron: hủy đơn chuyển khoản quá hạn') › it('hủy từng đơn: hoàn kho, ghi "system"; đơn vừa được thanh toán thì bỏ qua')** (`);`): o2: tiền vừa về

## `src/app/orders/orders.service.ts`

- **EXPIRE_BATCH_SIZE**: Số đơn quá hạn xử lý mỗi lần cron chạy (còn lại để lần sau).
- **PAYMENT_ORDER_SELECT**: Field của đơn cần để đối chiếu 1 giao dịch chuyển khoản.
- **TransitionOptions › requireUnpaid**: Chỉ chuyển khi đơn CHƯA trả tiền (cron hủy đơn quá hạn: tránh hủy đơn vừa nhận tiền).
- **MY_ORDER_LIST_SELECT**: Thông tin hiển thị ở danh sách "Đơn của tôi".
- **buildAdminOrderWhere**: Bộ lọc admin → where của Prisma. Lọc theo email qua quan hệ user.
- **OrdersService › findMineByNumber**: Chi tiết + lịch sử trạng thái. Đơn của người khác cũng trả 404 (không lộ mã đơn tồn tại).
- **OrdersService › cancelMine**: Customer tự hủy: chỉ khi đơn còn "Chờ xác nhận".
- **OrdersService › markPaidManually**: Admin xác nhận đã nhận tiền thủ công: khách chuyển sai nội dung nên SePay không khớp được,
  hoặc chuyển thành nhiều lần. Đơn chờ xác nhận thì chuyển luôn sang "Đã xác nhận".
- **OrdersService › exportExcel › worksheets › fieldsExtend** (`fieldsExtend: [...ORDER_EXCEL_COLUMNS],`): không có đơn vẫn có header
- **OrdersService › createInTx**: Tạo đơn trong transaction của checkout: sinh mã đơn và dòng đầu tiên của lịch sử.
- **OrdersService › countPromotionUsage**: Số đơn chưa hủy của user đã dùng mã giảm giá (kiểm tra perUserLimit).
- **OrdersService › findForPayment**: Đơn để đối chiếu giao dịch chuyển khoản (payments dùng, trong transaction của webhook).
- **OrdersService › markPaid**: Đánh dấu đã trả tiền TRONG transaction của bên gọi (webhook SePay / admin xác nhận tay).
  Đơn đang chờ xác nhận thì chuyển luôn sang "Đã xác nhận" và ghi lịch sử.
  Ghi vào document đơn → 2 lần xử lý đồng thời sẽ xung đột và được chạy lại tuần tự.
- **OrdersService › cancelExpiredUnpaid**: Cron: hủy đơn chuyển khoản chưa nhận tiền quá ORDER_UNPAID_TIMEOUT_MINUTES (hoàn kho, trả lượt mã).
  Mỗi đơn 1 transaction riêng; đơn vừa được thanh toán / đổi trạng thái giữa chừng thì bỏ qua.
  @returns số đơn đã hủy
- **OrdersService › cancelExpiredUnpaid**: HttpException: đơn vừa được thanh toán / đổi trạng thái → bỏ qua là đúng
- **OrdersService › findReviewableOrderIDs**: ID các đơn ĐÃ GIAO của user có chứa sản phẩm (mới nhất trước): điều kiện để viết review.
- **OrdersService › salesReport**: Báo cáo bán hàng trong khoảng [from, to] (dashboard, plan mục 15):
   - daily: doanh thu + số đơn theo NGÀY GIỜ VIỆT NAM (aggregateRaw, Prisma groupBy không nhóm theo ngày được)
   - topProducts: sản phẩm bán nhiều nhất (theo số lượng, lấy từ snapshot trong đơn)
   - byStatus: số đơn theo trạng thái
  Doanh thu = tổng `total` của đơn tạo trong khoảng, KHÔNG tính đơn đã hủy / trả hàng.
- **OrdersService › countPending**: Dashboard: đơn đang chờ xác nhận (cần xử lý ngay, không phụ thuộc khoảng ngày).
- **OrdersService › totalSpent**: Tổng chi tiêu: chỉ tính đơn đã giao (tiền đã thực sự trả).
- **OrdersService › transition**: Chuyển trạng thái + tác dụng phụ trong CÙNG 1 transaction (plan mục 11):
   - cancelled: hoàn kho các dòng đã trừ kho, trả lại 1 lượt mã giảm giá, đã trả tiền → refunded
   - delivered: cộng soldCount; COD thì coi như đã thu tiền (paid)
   - returned: trừ lại soldCount; đã trả tiền → refunded. KHÔNG tự cộng kho
     (hàng trả về cần kiểm tra, admin nhập kho bằng PATCH /admin/variants/:id/stock)

  Đọc và ghi cùng document đơn trong transaction: 2 request đổi trạng thái cùng lúc thì
  request sau xung đột, chạy lại, đọc trạng thái mới và bị từ chối (không hoàn kho 2 lần).
  Commit xong thì gửi email cho khách (chạy nền).
