# Prisma: schema và seed

## `prisma/schema.prisma`

- **enum OrderStatus.pending** (`pending`): vừa đặt, chờ xác nhận / chờ thanh toán
- **enum OrderStatus.confirmed** (`confirmed`): shop đã xác nhận (hoặc đã thanh toán online)
- **enum OrderStatus.processing** (`processing`): đang chuẩn bị / đang sản xuất (hàng đặt làm)
- **enum OrderStatus.shipping** (`shipping`): đang giao
- **enum OrderStatus.delivered** (`delivered`): đã giao
- **enum PaymentMethod.bank_transfer** (`bank_transfer`): chuyển khoản VietQR, SePay xác nhận qua webhook
- **type ImageItem.publicID** (`publicID  String?`): Cloudinary public_id, để xóa ảnh
- **type VariantOption.name** (`name  String`): "Màu", "Kích thước", "Chất liệu"
- **type VariantOption.value** (`value String`): "Xám", "3 chỗ", "Gỗ sồi"
- **type OrderItem.assemblyFee** (`assemblyFee Int`): phí lắp đặt cho dòng này (0 nếu không lắp)
- **type OrderItem.stockReserved**: Đã trừ kho lúc đặt hay chưa (false: hàng đặt làm allowBackorder). Hủy đơn chỉ hoàn kho dòng true,
  không phụ thuộc allowBackorder hiện tại của product (admin có thể đã đổi).
- **type ShippingAddress.district** (`district String?`): từ 01/07/2025 không còn cấp huyện, giữ cho địa chỉ cũ
- **type OrderStatusLog.changedBy** (`changedBy String?`): email người thao tác hoặc "system". KHÔNG đặt tên `by`: zod-prisma-types crash
- **model User.resetPasswordToken** (`resetPasswordToken String?`): lưu dạng hash
- **model User.tokenVersion**: Tăng lên khi đổi / reset mật khẩu hoặc bị khóa → mọi refresh token đã phát mất hiệu lực.
  Optional (thiếu = 0) để document cũ chưa có field này vẫn đọc được, không cần migrate.
- **model Address.district** (`district  String?`): từ 01/07/2025 không còn cấp huyện, giữ cho địa chỉ cũ
- **model Category.parent**: MongoDB: quan hệ tự trỏ bắt buộc NoAction
- **model Collection**: Bộ sưu tập (theo chủ đề / mùa / chiến dịch). Một sản phẩm thuộc được nhiều bộ sưu tập:
  quan hệ lưu ở Product.collectionIDs (mảng ID, không khai báo relation của Prisma).
- **model Collection.image** (`image       ImageItem?`): ảnh bìa
- **model Collection.startsAt** (`startsAt    DateTime?`): bỏ trống = hiển thị ngay
- **model Collection.endsAt** (`endsAt      DateTime?`): bỏ trống = không hết hạn
- **model Product.description** (`description      String?`): HTML / markdown
- **model Product.collectionIDs** (`collectionIDs    String[]    @db.ObjectId`): nhiều bộ sưu tập, có thể còn ID của bộ sưu tập đã xóa
- **model Product.rooms**: Các field để lọc. Giá trị lấy từ hằng số (mục 3.2)
- **model Product.rooms** (`rooms     String[]`): "living-room", "bedroom"...
- **model Product.styles** (`styles    String[]`): "scandinavian", "japandi"...
- **model Product.materials** (`materials String[]`): "oak", "rattan"...
- **model Product.colors** (`colors    String[]`): tổng hợp từ các variant
- **model Product.minPrice**: Giá hiển thị: tính lại mỗi khi sửa variant
- **model Product.assemblyFee** (`assemblyFee      Int     @default(0)`): VND / sản phẩm
- **model Product.allowBackorder** (`allowBackorder   Boolean @default(false)`): hàng đặt làm: cho đặt khi hết kho
- **model Product.leadTimeDays** (`leadTimeDays     Int     @default(0)`): thời gian sản xuất nếu đặt làm
- **model ProductVariant**: Mọi sản phẩm có ít nhất 1 variant (variant mặc định), nên giỏ hàng và đơn hàng luôn trỏ tới variant.
- **model ProductVariant.sku** (`sku            String          @unique`): BẮT BUỘC (xem lưu ý mục 9)
- **model ProductVariant.name** (`name           String`): "Sofa 3 chỗ - Xám"
- **model ProductVariant.compareAtPrice** (`compareAtPrice Int?`): giá gạch ngang
- **model Order.@@index([promotionID, userID])** (`@@index([promotionID, userID])`): đếm lượt dùng mã của 1 user (perUserLimit)
- **model Payment**: 1 giao dịch tiền vào do SePay báo qua webhook (plan mục 12).
  status: paid = giao dịch này đã thanh toán đơn; failed = tiền đã vào nhưng KHÔNG dùng cho đơn
  (sai số tiền, đơn đã hủy / đã trả) → admin đối soát, hoàn tiền thủ công.
- **model Payment.amount** (`amount        Int`): số tiền thực nhận
- **model Payment.transactionID** (`transactionID String        @unique`): `id` giao dịch của SePay: chặn xử lý trùng khi webhook gửi lại
- **model Payment.rawResponse** (`rawResponse   Json?`): payload webhook gốc, để đối soát
- **model Promotion.value** (`value         Int`): % (1–100) hoặc số tiền VND
- **model Promotion.maxDiscount** (`maxDiscount   Int?`): trần giảm cho loại percentage
- **model Promotion.usageLimit** (`usageLimit    Int?`): tổng lượt dùng
- **model Review.rating** (`rating    Int`): 1–5
- **model ShippingZone.name** (`name              String`): "Nội thành HCM", "Miền Bắc"...
- **model ShippingZone.provinces** (`provinces         String[]`): danh sách tỉnh thuộc vùng
- **model ShippingZone.baseFee** (`baseFee           Int`): phí cho khối lượng đầu
- **model ShippingZone.baseWeightKg** (`baseWeightKg      Float`): vd 5kg
- **model ShippingZone.feePerKg** (`feePerKg          Int`): phí mỗi kg tiếp theo
- **model ShippingZone.bulkySurcharge** (`bulkySurcharge    Int      @default(0)`): phụ phí hàng cồng kềnh
- **model ShippingZone.freeShipThreshold** (`freeShipThreshold Int?`): đơn >= giá trị này thì free ship (trừ hàng cồng kềnh)

## `prisma/seed-data/collections.ts`

- **DAY**: Bộ sưu tập mẫu cho `npm run db:seed`. `products` là tên sản phẩm trong SEED_PRODUCTS
  (sai tên thì seed báo lỗi). Một sản phẩm nằm được trong nhiều bộ sưu tập.
- **SeedCollection › startsInDays**: Số ngày tính từ lúc seed; bỏ trống = không giới hạn

## `prisma/seed-data/products.ts`

- **(đầu file)**: Sản phẩm mẫu cho `npm run db:seed` (plan mục 13): đèn trang trí làm từ vỏ sò, vỏ điệp, xà cừ, vỏ ốc.
  27 sản phẩm, 1–6 variant mỗi sản phẩm.
  `category` là slug danh mục con đã seed (den-tha, den-chum, den-ban...).
- **Size**: [nhãn kích thước, giá, [dài, rộng, cao] cm, cân nặng kg]
- **matrix**: Sinh variant từ tổ hợp kích thước × màu.
  Vd matrix('THA-HALONG', [['Ø30', ...], ['Ø40', ...]], ['Trắng tự nhiên', 'Ánh ngọc trai']) → 4 variant.
  Không có kích thước thì truyền [['', giá, dims, kg]]; không có màu thì truyền [].
- **SHELL**: Màu vỏ dùng chung cho nhiều mẫu
- **SEED_PRODUCTS**: ── Đèn trần ──
- **SEED_PRODUCTS**: ── Đèn tường ──
- **SEED_PRODUCTS**: ── Đèn bàn & đèn cây ──
- **SEED_PRODUCTS**: ── Đèn trang trí ──
- **SEED_PRODUCTS**: ── Phụ kiện đèn ──

## `prisma/seed.ts`

- **(đầu file)**: Seed dữ liệu ban đầu: admin, customer mẫu (chỉ ngoài production), cây danh mục, bộ sưu tập, sản phẩm mẫu,
  vùng giao hàng, mã giảm giá.
  Chạy: npm run db:seed. Chạy lại nhiều lần vẫn an toàn (upsert theo email / slug,
  không ghi đè mật khẩu của tài khoản đã có).

  Biến môi trường (tùy chọn):
    SEED_ADMIN_EMAIL     mặc định admin@homedecor.local
    SEED_ADMIN_PASSWORD  bỏ trống thì sinh ngẫu nhiên và in ra một lần
- **`}`**: không có .env thì dùng biến môi trường sẵn có
- **CATEGORY_TREE**: Cửa hàng đèn trang trí làm từ vỏ sò / vỏ điệp / xà cừ. Slug cha và con không được trùng nhau.
- **slugify**: "Bàn trà" -> "ban-tra"
- **upsertUser**: Tạo user nếu chưa có. Đã có thì chỉ bảo đảm role / status, KHÔNG đổi mật khẩu.
- **seedUsers** (`if (isProduction) return;`): không tạo tài khoản mẫu trên production
- **resetCatalog**: `--reset-catalog`: xóa cứng toàn bộ danh mục, bộ sưu tập, sản phẩm, variant và dữ liệu trỏ tới chúng
  (review, item trong giỏ, wishlist) để seed lại catalog từ đầu. Đơn hàng giữ nguyên vì là snapshot.
  Ảnh đã upload lên Cloudinary không bị xóa. Không chạy trên production.
- **seedCategories**: Các danh mục con độc lập với nhau → upsert song song (slug khác nhau, không đụng index)
- **seedCollections**: Bộ sưu tập chưa có (theo slug) thì tạo, đã có thì giữ nguyên (admin có thể đã sửa).
  Trả về: tên sản phẩm → ID các bộ sưu tập chứa nó.
- **seedProducts**: Sản phẩm mẫu. Bỏ qua sản phẩm đã có (theo slug) hoặc có SKU đã tồn tại,
  nên chạy lại không bị trùng. minPrice / maxPrice / colors tính bằng đúng hàm của API.
  Sản phẩm đã có vẫn được bổ sung bộ sưu tập còn thiếu (không gỡ bộ sưu tập admin đã gán thêm).
- **seedProducts › data › soldCount** (`soldCount: (index * 7) % 40,`): để sắp xếp "bán chạy" có dữ liệu
- **SHIPPING_ZONES**: 5 vùng giao hàng (plan mục 13). Mỗi tỉnh thuộc đúng 1 vùng, kiểm tra trước khi ghi.
- **seedShippingZones**: Vùng chưa có (theo tên) thì tạo, đã có thì giữ nguyên (admin có thể đã sửa phí).
