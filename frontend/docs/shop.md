# Cửa hàng

## Màu và font

- Nền trắng. Chữ gần đen ngả ấm, bề mặt phụ màu cát nhạt (màu vỏ sò). Không có màu nhấn rực: ảnh sản phẩm và ánh đèn là điểm màu.
- `--radius: 0.25rem`: nút, ô nhập, card tối đa 4px.
- Sidebar admin: trắng ngả cát rất nhẹ để tách khỏi vùng nội dung trắng.
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
- Sản phẩm nổi bật: tiêu đề bên trái, `ProductRail` bên phải (kéo / cuộn / nút trước-sau, thanh tiến độ).
- Cách làm: quy trình nên đánh số. Câu chuyện vỏ sò: ảnh các loại vỏ bên trái, chữ bên phải.
- `Marquee`: nội dung lặp 2 lần để chạy liền mạch, bản lặp ẩn với trình đọc màn hình, tắt khi người dùng bật giảm chuyển động.
- `ProductTile`: ảnh bo nhẹ, tên, mô tả ngắn in hoa, giá. Ô vuông màu cát bên phải là dấu hiệu "chọn mẫu để mua": phải chọn variant ở trang chi tiết trước khi thêm vào giỏ, nên cả thẻ dẫn sang trang sản phẩm.
- `ImagePlaceholder`: khối giữ chỗ nền cát (các sắc độ token muted / secondary), tỉ lệ và bo góc đặt qua `className`; `label` mô tả ảnh thật sẽ đặt vào, dùng làm `alt` khi thay bằng `<Image>`.
- `CtaLink`: nút lớn, chữ hẹp in hoa trái, mũi tên phải. `ArrowLink`: link chữ + mũi tên.

## Trang auth

Desktop: bên trái panel tối có quầng đèn (cùng hình ảnh với phần "Lúc tắt và lúc bật" ở trang chủ) và logo ở góc trên; bên phải là form. Mobile: panel ẩn, logo lên header sáng phía trên form.
