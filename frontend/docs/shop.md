# Cửa hàng

## Màu và font

- Nền trắng. Chữ gần đen ngả ấm, bề mặt phụ màu cát nhạt (màu vỏ sò). Không có màu nhấn rực: ảnh sản phẩm và ánh đèn là điểm màu.
- `--radius: 0.25rem`: nút, ô nhập, card tối đa 4px.
- Sidebar admin: trắng ngả cát rất nhẹ để tách khỏi vùng nội dung trắng.
- Màu dữ liệu biểu đồ `--chart-1`: nâu hổ phách `oklch(0.584 0.109 62)` (≈ `#a96b2e`, tông ánh đèn). Đã chạy bộ kiểm tra màu (độ sáng 0.43–0.77, độ bão hòa ≥ 0.10, tương phản ≥ 3:1 trên nền trắng); các tông nâu nhạt hơn bị coi là ngả xám. Chỉ dùng cho mark của biểu đồ / thanh tỉ lệ, chữ vẫn dùng token chữ.
- Tiêu đề: **Cormorant Garamond**, serif nét thanh kiểu Garamond, chữ hoa giãn rộng cùng tinh thần chữ khắc trong logo; bản nghiêng mềm như ánh đèn.
- Nội dung, nút, nhãn: **Be Vietnam Pro**, thiết kế riêng cho dấu tiếng Việt, đọc rõ ở cỡ nhỏ; in hoa giãn chữ giống tagline "LIGHT WHAT YOU FEEL" của logo.
- `label-caps`: nhãn nhỏ in hoa giãn chữ (nút, nhãn, tiêu đề cột footer), giống tagline logo. `display-caps`: chữ hoa serif giãn rộng như "O T H E o" trong logo, cỡ chữ đặt riêng.
- `SectionTitle`: ghép phần nghiêng viết thường + phần chữ hoa giãn rộng (nhỏ hơn một chút để 2 phần cân thị giác), `stacked` để xếp 2 dòng.

## Logo

`public/images/oto_logo.png` 978 × 385, nền trong suốt. `BrandLogo`: chiều cao đặt qua class, `sizes` để trình duyệt chọn đúng ảnh, `eager` cho logo ở màn hình đầu. Trên nền tối để cỡ lớn vì chữ nâu hơi chìm.

## Header

- Desktop: menu chính gạch chân trang đang mở; tài khoản là dropdown (`HeaderUserMenu`), chưa đăng nhập là link "Đăng nhập". Khi đang tải `/me` giữ chỗ để header không nhảy.
- Mobile: panel trượt từ phải, chữ lớn như trang mục lục; khối tài khoản ở cuối (`MobileAccount`).
- `ACCOUNT_NAV` dùng chung cho dropdown, menu mobile và `AccountNav`.
- `UserAvatar`: `round` cho shop, `square` cho admin. Chưa có ảnh thì hiện chữ cái đầu ("Nguyễn Văn An" → "NA") trên nền cát; header hiện tên gọi ("An").

## Landing page

- Hero chia 6:4: banner 60% bên trái (sát mép màn hình), chữ 40% bên phải. Banner giữ khung 16:9, không cắt, vì ảnh có sẵn chữ thương hiệu ở nửa phải. Mobile: banner trên, chữ dưới.
- Bật / tắt đèn (`LampSwitch`): điểm nhấn của trang. Bấm nút thì cả khối chuyển nền tối, ảnh đổi sang đèn đang sáng; chỉ đổi khi khách bấm. `LampGlow` (quầng sáng) chỉ dùng token đen trắng: khi có ảnh thật chụp lúc đèn bật, ánh đèn trong ảnh là màu duy nhất.
- Sản phẩm nổi bật: tiêu đề bên trái, `ProductRail` bên phải (kéo / cuộn / nút trước-sau, thanh tiến độ). Dữ liệu từ `GET /products/featured`.
- Bộ sưu tập (`CollectionShowcase`): `GET /collections`, ưu tiên bộ `isFeatured`, tối đa 4. Thẻ đầu to (7/12 cột, cao 2 hàng), các thẻ sau 5/12. Bấm vào dẫn tới `/products?collection=<slug>`. Không có bộ nào thì ẩn cả mục.
- Cách làm: quy trình nên đánh số. Câu chuyện vỏ sò: ảnh các loại vỏ bên trái, chữ bên phải.
- `Marquee`: nội dung lặp 2 lần để chạy liền mạch, bản lặp ẩn với trình đọc màn hình, tắt khi người dùng bật giảm chuyển động.
- `ProductTile` (`features/products/components`): ảnh bo nhẹ, tên, mô tả ngắn, giá ("Từ …" khi các variant khác giá, "Liên hệ" khi giá 0), sao đánh giá, nhãn "Làm theo đơn" khi `allowBackorder`. Ô vuông màu cát bên phải là dấu hiệu "chọn mẫu để mua": phải chọn variant ở trang chi tiết trước khi thêm vào giỏ, nên cả thẻ dẫn sang trang sản phẩm. `dense` cho lưới 2 cột trên mobile: chữ nhỏ hơn, ẩn ô túi dưới `sm`.
- `ImagePlaceholder` (`components/`): khối giữ chỗ nền cát (các sắc độ token muted / secondary), tỉ lệ và bo góc đặt qua `className`; `label` mô tả ảnh thật sẽ đặt vào, dùng làm `alt` khi thay bằng `<Image>`.
- `CtaLink`: nút lớn, chữ hẹp in hoa trái, mũi tên phải. `ArrowLink`: link chữ + mũi tên.

## Hiệu ứng

Cảm giác "đồ làm tay": chậm, mềm, không nảy. Mọi hiệu ứng tắt khi người dùng bật giảm chuyển động.

- `--ease-soft` (`cubic-bezier(0.2, 0.7, 0.2, 1)`): đường cong chung cho hover và xuất hiện.
- `animate-rise`: chữ / thẻ nổi lên 16px và hiện dần, xếp lần lượt bằng `animation-delay` (hero trang chủ, header trang sản phẩm, 6 thẻ đầu của lưới).
- `animate-settle`: ảnh hero thu từ 106% về 100% trong 1,8s, như máy ảnh lấy nét.
- `reveal`: hiện khi cuộn tới, dùng scroll-driven animation (`animation-timeline: view()`) nên không cần JS; trình duyệt không hỗ trợ thì phần tử hiện sẵn. Lệch nhịp bằng biến `--reveal-delay` (phần trăm). Phần tử đã nằm trong màn hình lúc tải thì không chạy hiệu ứng, nên phần đầu trang dùng `animate-rise`.
- Hover thẻ sản phẩm: ảnh phóng 104% trong 0,9s, ảnh thứ 2 (nếu có) hiện chồng lên, gạch chân tên. Thẻ bộ sưu tập: ảnh phóng 105% trong 1,2s, ô mũi tên chuyển nền tối.

## Trang sản phẩm (`/products`)

- Server Component đọc `searchParams` trong `<Suspense>` (`CatalogSkeleton`), build ra ◐: khung tĩnh, danh sách stream lúc request. Gọi song song `GET /products`, `GET /products/filters` (theo `category` / `collection` đang chọn), `GET /categories`, `GET /collections`.
- URL là nguồn sự thật: `parseCatalogQuery` (`features/catalog/product-query.ts`) lọc giá trị sai trước khi gửi backend (enum, slug, số nguyên, đổi chỗ khoảng giá ngược) để không dính lỗi 400; `catalogHref(query, patch)` dựng link, đổi bộ lọc thì về trang 1, bỏ giá trị mặc định (`sort=newest`, `page=1`).
- `GET /products` và `/products/filters` nhận thêm `collection=<slug>` (có trong DTO backend). Tên bộ sưu tập / danh mục lấy từ danh sách đã tải, không gọi thêm `GET /collections/:slug`.
- Điều hướng: `CatalogNavProvider` bọc trang, `navigate` chạy `router.push` trong `useTransition`; `CatalogResults` mờ đi khi đang chờ thay vì hiện lại skeleton. `CatalogLink` vẫn là `<a href>` thật (crawler và mở tab mới vẫn dùng được), chỉ chặn click thường. Đổi bộ lọc / trang thì cuộn lên đầu kết quả nếu đang ở dưới.
- Bộ lọc chỉ hiện giá trị đang có sản phẩm (`/products/filters`): danh mục (cây 2 cấp), bộ sưu tập, chất liệu (chọn nhiều, checkbox), không gian / phong cách / màu (chọn 1, chip), khoảng giá (nhập số, có dấu chấm ngăn cách, bấm Áp dụng), "còn hàng hoặc làm theo đơn" (`inStock=true`). Desktop: cột trái dính khi cuộn; mobile: Sheet bên trái, nút dưới cùng "Xem N sản phẩm".
- Chip bộ lọc đang chọn phía trên lưới, mỗi chip là link bỏ đúng giá trị đó. "Xóa tất cả" giữ lại từ khóa và cách sắp xếp.
- `?collection=` có hero riêng (ảnh bìa trái, tên + mô tả phải); `?category=` đổi tiêu đề và mô tả theo danh mục.
- 12 sản phẩm mỗi trang (`CATALOG_PAGE_SIZE`). Phân trang bằng link (`rel=prev/next`), mobile chỉ hiện "Trang x / y".

## Trang chi tiết (`/products/[slug]`)

- `getProduct(slug)` trả 3 trạng thái: `found`, `missing` (404, cache `minutes`, trang gọi `notFound()` → `[slug]/not-found.tsx`), `error` (lỗi mạng, cache `seconds`, hiện nút tải lại). `generateMetadata` dùng chung hàm cache nên không gọi API 2 lần; og:image là ảnh bìa.
- `notFound()` chạy sau khi đã stream nên mã HTTP vẫn là 200, Next tự thêm `<meta name="robots" content="noindex">`.
- Thứ tự stream: khung trên (gallery + khối mua) trước, đánh giá và sản phẩm liên quan nằm trong `<Suspense>` riêng.
- **Chọn biến thể** (`features/products/variants.ts`):
  - Nhóm theo tên tùy chọn của variant (`Kích thước`, `Màu`...). Variant không cùng bộ tùy chọn thì chọn theo tên variant (nhóm "Mẫu"). 1 variant thì không hiện nút chọn.
  - Mặc định: variant đầu tiên mua được (backend trả giá tăng dần).
  - Nút giá trị: tổ hợp hết hàng thì gạch ngang, tổ hợp không tồn tại thì viền đứt. Bấm vào tổ hợp không tồn tại vẫn được: nhảy sang variant gần nhất có giá trị đó, ưu tiên còn hàng.
  - "Mua được" = còn tồn kho hoặc `allowBackorder`. Số lượng tối đa = tồn kho (tối đa 99), hàng làm theo đơn thì 99.
- Gallery: ảnh của variant đang chọn đứng trước rồi tới ảnh sản phẩm (bỏ trùng). Đổi variant thì về ảnh đầu, ảnh chuyển bằng `animate-fade`. Rê chuột lên ảnh để phóng 1,9 lần tại vị trí con trỏ (xem cận vân vỏ); chỉ với chuột, không áp dụng cảm ứng.
- Giá: giá variant; có `compareAtPrice` thì gạch ngang và hiện "−x%" (viền, không dùng màu nhấn).
- **Thêm vào giỏ** (`useAddToCart`): biết chắc chưa đăng nhập (`me === null`) thì chuyển `/sign-in?next=<trang hiện tại>`; gặp 401 cũng vậy. Thành công thì ghi giỏ trả về vào cache `['cart']` và hiện toast. Lỗi tồn kho (409) hiện nguyên câu của backend.
- Mô tả là văn bản thường (admin nhập bằng textarea), hiển thị `whitespace-pre-line`, không render HTML.
- Đánh giá: trang đầu lấy ở server (`getFirstReviews`, 6 đánh giá); lọc theo số sao (bấm thanh phân bố), sắp xếp, "Xem thêm" chạy ở client bằng `useInfiniteQuery`. Thống kê luôn lấy từ trang đầu vì backend tính trên mọi đánh giá.

## Trang auth

Desktop: bên trái panel tối có quầng đèn (cùng hình ảnh với phần "Lúc tắt và lúc bật" ở trang chủ) và logo ở góc trên; bên phải là form. Mobile: panel ẩn, logo lên header sáng phía trên form.
