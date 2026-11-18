# Dùng chung (src/common)

## `src/common/constants/catalog.const.ts`

- **ROOMS**: Giá trị cho các field lọc của Product (plan mục 3.2).
  Dùng trong Zod (z.enum) để dữ liệu nhập vào luôn đồng nhất.
- **COLOR_OPTION_NAMES**: Tên option của variant được coi là "màu" (so sánh sau khi bỏ dấu, viết thường).
  Vd variant có option { name: 'Màu', value: 'Xám' } → product.colors chứa 'Xám'.
- **PROVINCES**: 34 tỉnh / thành phố từ 01/07/2025 (Nghị quyết 202/2025/QH15). Dùng chung cho validate
  địa chỉ, vùng giao hàng và seed. Địa chỉ lưu đúng chuỗi trong danh sách này.
- **PROVINCES**: 6 thành phố trực thuộc trung ương
- **PROVINCES**: 28 tỉnh

## `src/common/decorators/cookie/cookie.const.ts`

- **COOKIE_CONFIG_DEFAULT**: Cookie đăng nhập. `SameSite=Lax`: trình duyệt không gửi cookie kèm request POST từ site khác.
  FE và API cùng site (cùng domain gốc, khác port / subdomain vẫn tính là cùng site) dùng 'lax'.
  Chỉ đặt COOKIE_SAME_SITE=none khi FE và API khác domain gốc; khi đó middleware `verifyOrigin`
  vẫn chặn CSRF.

## `src/common/decorators/public.decorator.ts`

- **Public**: Route không cần đăng nhập. Mặc định mọi route đều cần (AuthGuard global).

## `src/common/decorators/skip-format-response.decorator.ts`

- **SkipFormatResponse**: Trả nguyên giá trị controller trả về, không bọc `{ errors, data, message }`.
  Dùng cho route mà bên gọi cần đúng một body cố định (vd webhook SePay cần `{ "success": true }`).
  Route trả `StreamableFile` (tải file) tự được bỏ qua, không cần gắn decorator này.

## `src/common/decorators/user.decorator.ts`

- **UserInfo**: Payload của access token, được AuthGuard gắn vào `req.user`.

## `src/common/dto/param.dto.ts`

- **slugSchema**: "ban-tra", "sofa-3-cho": chữ thường không dấu, số, gạch ngang giữa các từ.

## `src/common/dto/query.dto.ts`

- **(đầu file)**: Query string luôn là chuỗi, các helper dưới đây chuyển sang đúng kiểu.
- **booleanQuery**: "true" / "false" → boolean
- **searchQuery**: Chuỗi tìm kiếm: bỏ khoảng trắng 2 đầu, 1–100 ký tự.
- **dateQuery**: "2026-11-01" hoặc ISO datetime → Date.
- **vnDateQuery**: Ngày trong query: "2026-11-13" hiểu là cả ngày theo giờ Việt Nam
  (start = 00:00, end = 23:59:59.999); chuỗi ISO đầy đủ thì giữ nguyên.
- **toVnDate**: "YYYY-MM-DD" của 1 thời điểm theo giờ Việt Nam.
- **paginate**: skip / take cho Prisma từ page (bắt đầu từ 1).

## `src/common/dto/url.schema.ts`

- **httpUrlSchema**: URL chỉ nhận http(s). `z.string().url()` nhận mọi scheme (`javascript:`, `data:`...),
  frontend render thành href / src sẽ bị XSS. Dùng cho MỌI field URL do người dùng nhập.
- **httpUrlSchema**: Không dùng new URL() ở đây: refine vẫn chạy khi .url() đã fail, new URL() sẽ ném lỗi

## `src/common/envs/validate.env.spec.ts`

- **describe('validate (env)') › it('env tối thiểu hợp lệ: điền mặc định, ép kiểu số, giữ biến lạ') › MAIL_PORT** (`MAIL_PORT: 587,`): để trống → mặc định
- **describe('validate (env)') › it('production: xác thực webhook SePay bằng HMAC (SECRET) hoặc API key, phải có ít nhất 1')** (`).not.toThrow();`): dev chỉ cảnh báo

## `src/common/envs/validate.env.ts`

- **optionalWithWarning**: Biến tùy chọn: thiếu thì chỉ cảnh báo (tính năng liên quan không chạy).
- **positiveInt**: Số nguyên dương, để trống thì lấy mặc định.
- **secret**: Bắt buộc có. Độ dài tối thiểu chỉ chặn ở production (dev: cảnh báo).
- **envSchema › TRUST_PROXY**: Số reverse proxy phía trước app (Render / Railway: 1). 0 = không có proxy
- **envSchema › MAIL_HOST**: Brevo SMTP relay. Bỏ trống MAIL_HOST: không gửi mail (dev in nội dung ra log)
- **envSchema › MAIL_USER** (`MAIL_USER: optionalString,`): SMTP login do Brevo cấp, không phải email gửi đi
- **envSchema › MAIL_PASS** (`MAIL_PASS: optionalString,`): SMTP key
- **envSchema › MAIL_FROM** (`MAIL_FROM: optionalString,`): sender đã xác minh trên Brevo (bắt buộc khi có MAIL_HOST)
- **envSchema › ORDER_UNPAID_TIMEOUT_MINUTES** (`ORDER_UNPAID_TIMEOUT_MINUTES: positiveInt(30),`): đơn chuyển khoản chưa nhận tiền quá hạn → cron hủy
- **envSchema**: SePay (chuyển khoản). Thiếu thì không đặt được đơn bank_transfer; production bắt buộc
- **envSchema › SEPAY_WEBHOOK_SECRET**: Xác thực webhook: SEPAY_WEBHOOK_SECRET (HMAC-SHA256, khuyến nghị) hoặc SEPAY_WEBHOOK_API_KEY
- **envSchema** (`.passthrough()`): giữ các biến chưa khai báo ở đây (SEED_*...)
- **envSchema**: Brevo chỉ gửi từ sender đã xác minh; thiếu MAIL_FROM thì nodemailer lấy MAIL_USER (SMTP login) → bị từ chối
- **envSchema**: Webhook SePay phải có 1 cách xác thực, không thì ai cũng gọi được để đánh dấu đơn đã trả tiền
- **validate**: Dùng trong `ConfigModule.forRoot({ validate })`: thiếu / sai biến bắt buộc thì app dừng
  ngay lúc khởi động, báo rõ tên biến (không đợi tới khi có request chạm tới).

## `src/common/guards/auth.guard.ts`

- **AuthGuard**: Global guard: mọi route cần access token, trừ route gắn `@Public()`.
  Token lấy từ header `Authorization: Bearer ...` hoặc cookie `accessToken`.

## `src/common/interceptors/format-response/format-response.interceptor.ts`

- **FormatResponseInterceptor**: Bọc mọi response thành công thành `{ errors: null, data, message }` (đăng ký global ở AppModule).
  Lỗi do CatchEverythingFilter định dạng, không đi qua đây.
  Bỏ qua: file (`StreamableFile`) và route gắn `@SkipFormatResponse()`.

## `src/common/middlewares/common.middleware.ts`

- **applyMiddlewares**: App phải được tạo với `NEST_APP_OPTIONS` (bodyParser: false): ở đây chỉ bật parser JSON,
  không nhận body urlencoded (loại form HTML cross-site gửi được). Thứ tự middleware có ý nghĩa:
  cookieParser phải chạy trước verifyOrigin, và mọi bước kiểm tra chạy trước khi parse body.

## `src/common/middlewares/csrf.middleware.ts`

- **reject**: Trả lỗi cùng format với CatchEverythingFilter (middleware Express chạy ngoài filter của Nest).
- **parseOrigins**: "https://a.com/, http://b.com" → ["https://a.com", "http://b.com"]. Bỏ qua giá trị không phải URL.
- **verifyOrigin**: Chống CSRF: request ghi dữ liệu (POST/PUT/PATCH/DELETE) có mang cookie đăng nhập thì phải đến
  từ frontend (FE_URL) hoặc từ chính API (Swagger). Trình duyệt luôn gửi header `Origin` với
  request ghi cross-origin và trang web khác không sửa được header này.

  Chỉ kiểm tra request dùng cookie: client gửi `Authorization: Bearer` (mobile, Postman) và
  webhook server-to-server không bị CSRF nên không bị ảnh hưởng.
- **verifyOrigin › trusted** (`:`): Không có Origin (trình duyệt rất cũ / client không phải trình duyệt): dựa vào Sec-Fetch-Site
- **rejectNonJsonBody**: Chỉ nhận body JSON (và multipart cho route upload). Form HTML gửi được
  `application/x-www-form-urlencoded` / `text/plain` sang site khác mà không cần preflight CORS,
  nên chặn hẳn 2 loại này (415).
- **rejectNonJsonBody**: fetch(url, { method: 'POST' }) không body vẫn gửi "Content-Length: 0" và không có Content-Type
- **rejectNonJsonBody › hasBody**: (vd logout, refresh-token chỉ dùng cookie) → coi là không có body, cho qua

## `src/common/prisma/prisma.module.ts`

- **PrismaModule**: Re-export DateUtilModule (ExcelResponseInterceptor cần DateUtilService ở mọi module),
- **PrismaModule › imports**: không khai báo lại DateUtilService trong providers: tránh tạo thêm 1 instance thứ hai.

## `src/common/prisma/prisma.service.ts`

- **READ_OPERATIONS**: Các lệnh ĐỌC được tự thêm điều kiện "chưa xóa". Lệnh ghi (update / delete...) giữ nguyên.
- **PrismaService › extended** (`readonly extended = extend(this);`): service dùng this.prisma.extended.product.findMany(...)

## `src/common/prisma/raw.util.ts`

- **(đầu file)**: Helper cho `aggregateRaw` / `$runCommandRaw` của Prisma + MongoDB. Dữ liệu vào / ra ở dạng
  MongoDB Extended JSON: ngày là { $date }, ObjectId là { $oid }, số lớn có thể là { $numberLong }.
- **rawDate**: Date → giá trị dùng được trong pipeline thô (so sánh với field DateTime).
- **rawNumber**: Số trong kết quả thô: number, { $numberInt }, { $numberLong }, { $numberDouble } → number.
- **rawId**: ObjectId trong kết quả thô: { $oid } hoặc chuỗi → chuỗi 24 ký tự hex.

## `src/common/prisma/with-retry.ts`

- **isTransactionConflict**: Transaction bị xung đột ghi / deadlock (MongoDB: WriteConflict). Chạy lại là an toàn.
- **withRetry**: Chạy lại `fn` khi transaction bị xung đột ghi (P2034), có chờ ngắn + ngẫu nhiên
  để các request đang tranh nhau không đụng lại đúng lúc. Lỗi khác ném ra ngay.
  Hết lượt thì ném lỗi P2034, CatchEverythingFilter trả 409.

  Lưu ý: transaction MongoDB (snapshot isolation) KHÔNG chặn write skew. Muốn 2 transaction
  "đọc rồi kiểm tra" loại trừ nhau thì cả hai phải GHI vào cùng 1 document.

## `src/common/security/rate-limit/rate-limit.const.ts`

- **THROTTLE_DEFAULT**: Mặc định khi .env không khai báo: 100 request / 60 giây / IP.
- **STRICT_THROTTLE**: Giới hạn chặt cho route dễ bị dò mật khẩu / spam email: 5 lần / phút / IP.
  Dùng: @Throttle(STRICT_THROTTLE)

## `src/common/utils/excel-util/dto/excel-util.interface.ts`

- **File**: type File = Express.Multer.File;

## `src/common/utils/excel-util/excel-util.service.ts`

- **(đầu file)**: giống lodash.startCase, lodash không có trong package.json
- **ExcelUtilService › generateExcel › fields** (`data[0] ?? this.prismaService[camelCase(sheetName)]?.fields ?? {};`): sheet rỗng + tên không phải model → dùng fieldsExtend

## `src/common/utils/file-util/file-util.module.ts`

- **FileUtilModule › imports › useFactory › storage › destination › destination** (`'./uploads';`): .env không khai báo thì join(undefined) sẽ văng lỗi

## `src/common/utils/file-util/image-upload.const.ts`

- **MAX_IMAGE_SIZE** (`export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;`): 5MB
- **ALLOWED_MIME_TYPES**: Không nhận SVG (có thể chứa script) và GIF
- **imageUploadOptions**: Multer cho upload ảnh: chỉ jpg / png / webp, tối đa 5MB mỗi ảnh, tối đa `maxFiles` ảnh mỗi lần.

## `src/common/utils/file-util/image-upload.service.ts`

- **UploadedImage**: File multer đã lưu tạm trên đĩa (chỉ dùng tới path).
- **StoredImage**: Ảnh đã lên Cloudinary.
- **UploadPlan › publicIDPrefix**: public_id = "<prefix>-<12 ký tự hex>", không có "/" để dùng được làm tham số trên URL.
- **UploadPlan › before**: Kiểm tra trước khi upload (quyền, giới hạn số ảnh...). Lỗi ở đây thì không upload gì.
- **UploadPlan › save**: Lưu ảnh vào DB. Lỗi ở đây thì các ảnh vừa upload bị xóa khỏi Cloudinary.
- **ImageUploadService**: Upload ảnh lên Cloudinary (FileStrategy) cho mọi nơi: ảnh sản phẩm, ảnh review...
- **ImageUploadService › upload**: Tất cả hoặc không: 1 ảnh upload lỗi hoặc `save` lỗi thì xóa các ảnh đã lên Cloudinary
  (không để ảnh mồ côi). File tạm trên đĩa luôn bị xóa sau khi xong (kể cả khi lỗi).
- **ImageUploadService › destroyQuietly**: Xóa ảnh trên Cloudinary ở nền: không chặn response, lỗi chỉ ghi log.

## `src/common/utils/mail-util/mail-util.service.ts`

- **MailUtilService › constructor**: Giữ kết nối SMTP để dùng lại: không phải bắt tay TLS + đăng nhập lại cho từng email
- **MailUtilService › constructor › pool**: (đặt đơn, đổi trạng thái... gửi liên tục). Kết nối rảnh tự đóng, cần thì mở lại.
- **MailUtilService › send**: Dev: in nội dung ra log để test (vd lấy link reset password).
- **MailUtilService › send**: Production: không in nội dung vì có thể chứa token.

## `src/common/utils/pagination-util/pagination-util.service.ts`

- **PaginationUtilService › paging › skip** (`const skip = (page - 1) * itemPerPage;`): vị trí bắt đầu lấy phần từ

## `src/common/utils/string-util/html.util.ts`

- **RawHtml**: HTML đã an toàn (dựng bằng `safeHtml`), chèn vào template khác KHÔNG bị escape lại.
- **raw**: Đánh dấu đoạn HTML đã an toàn. CHỈ dùng cho kết quả của `safeHtml`, không bao giờ cho dữ liệu người dùng.
- **escapeHtml**: Escape để chèn chuỗi vào HTML (nội dung thẻ hoặc giá trị thuộc tính có dấu nháy).
- **safeHtml**: Tagged template dựng HTML an toàn: MỌI giá trị chèn vào đều được escape, trừ `RawHtml`
  (đoạn đã dựng bằng safeHtml). Mảng được nối lại. Dùng cho mọi email có dữ liệu người dùng nhập.

    safeHtml`<p>Chào ${user.fullName}</p>`
    safeHtml`<table>${items.map((i) => raw(safeHtml`<tr><td>${i.name}</td></tr>`))}</table>`

## `src/common/utils/string-util/slug.util.ts`

- **pickAvailableSlug**: Chọn slug chưa bị dùng: "ban-tra" → nếu đã có thì "ban-tra-2", "ban-tra-3"...

  @param base     slug gốc (đã chuẩn hóa, vd từ StringUtilService.toSlug)
  @param taken    các slug đã tồn tại bắt đầu bằng `base` (kể cả bản ghi đã xóa)
  @param reserved slug không được dùng vì trùng đường dẫn tĩnh (vd "featured")

## `src/common/utils/string-util/string-util.service.ts`

- **StringUtilService › toSlug** (`.normalize('NFD')`): tách dấu tiếng Việt
- **StringUtilService › toSlug** (`.replace(/[\u0300-\u036f]/g, '')`): xóa dấu
- **StringUtilService › toSlug** (`.replace(/[đĐ]/g, 'd'),`): chuyển đ -> d
