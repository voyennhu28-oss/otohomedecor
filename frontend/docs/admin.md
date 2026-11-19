# Admin

## Khung

- `app/admin/layout.tsx`: `AuthGuard role='admin'` bọc `AdminShell`. Metadata `robots: noindex`.
- `AdminShell` = shadcn `Sidebar` (thu gọn thành icon, Ctrl+B) + `AdminTopbar`. Shell chỉ render ở client (sau `AuthGuard`) nên đọc cookie `sidebar_state` (do `SidebarProvider` tự ghi) ngay khi khởi tạo state mà không lệch HTML server.
- Vùng nội dung cùng padding ngang với topbar để mép trái tiêu đề thẳng breadcrumb, rộng tối đa `max-w-screen-2xl`.
- Sidebar: mobile là Sheet, bấm link xong tự đóng. Thu gọn: cột 48px, nhóm `px-2` để nút icon 32px nằm giữa; không đủ chỗ cho logo nên hiện icon cửa hàng. Mục menu: chữ màu chính, icon xám; mục đang mở có nền cát + icon đậm (không thêm vạch).
- Menu (`components/layout/admin-nav.ts`): mỗi nhóm nên có từ 2 mục, tránh menu vụn. `/admin` chỉ active đúng trang đó; mục khác active cả ở trang con. Breadcrumb đọc nhóm / trang từ đây, khớp đường dẫn dài nhất trước.
- Breadcrumb: Nhóm › Trang › Trang con. Không có gốc "Quản trị" (đã có cạnh logo). Nhóm không phải trang nên không có link. Đoạn con `new` / `edit` / `import` có tên riêng, còn lại (ID, mã đơn) là "Chi tiết". Mobile chỉ hiện trang hiện tại.
- `AdminPageHeader`: tiêu đề cỡ vừa (không dùng tiêu đề hero của shop), mô tả, nút thao tác bên phải.
- Trang chưa nối API dùng `ComingSoon` (giai đoạn + endpoint), xóa khi làm xong.

## Trang danh sách

- Tìm / lọc / sắp xếp / trang lưu trên URL bằng `useUrlFilters(defaults)`: F5 hay gửi link vẫn giữ nguyên. Giá trị bằng mặc định không ghi lên URL. Đổi bộ lọc tự về trang 1 (trừ khi đang đổi `page`). `reset()` chỉ bỏ các key hook quản lý. Giá trị URL sai (sửa tay) thì về mặc định (`parseOption`, `parsePositiveInt`). Component dùng hook phải nằm trong `<Suspense>`.
- `SearchInput`: debounce 300ms, Enter / nút xóa áp dụng ngay. URL đổi từ bên ngoài (Xóa bộ lọc, back / forward) thì ô nhập cập nhật theo.
- `DataTablePagination`: dùng cho phân trang ở client và ở server (`Page<T> = { list, totalItems, totalPages }`, có `totalPages` thì dùng luôn). Dãy số luôn có trang đầu, cuối và 2 trang mỗi bên trang hiện tại; cách nhau đúng 1 trang thì hiện số đó thay vì "…". Mobile chỉ "Trang x / y".
- `DataTableState` (trống / lỗi / không có kết quả), `DataTableSkeleton` (đang tải).
- Ô lọc đang khác mặc định có viền đậm hơn để dễ nhận ra.

## Dialog

- Form dài: header / footer cố định, chỉ thân form cuộn và ẩn thanh cuộn (`no-scrollbar`). Lỗi chung của server đặt ngoài vùng cuộn, ngay trên footer.
- Dialog mở bằng `target | null`: dùng `useRetainedValue` để giữ nội dung khi đóng; mỗi lần mở (target mới) tăng một bộ đếm làm `key` cho form để form tạo lại từ đầu.

## Danh mục (`features/admin-categories`)

- `GET /admin/categories` trả cả cây, không phân trang / lọc ở server → lọc, sắp xếp, phân trang ở client (`filters.ts`, có test).
- Không lọc: dạng cây (thụt lề 24px mỗi cấp, thu gọn / mở nhánh, "Thu gọn tất cả"). Dòng con đứng đầu trang mà cha ở trang trước thì ghi đường dẫn cha. Có lọc / tìm / sắp xếp khác mặc định: danh sách phẳng, mỗi dòng ghi đường dẫn cha.
- Trạng thái "Ẩn theo danh mục cha": tự danh mục đang bật nhưng có tổ tiên đang ẩn (public cũng ẩn cả nhánh).
- Tìm không dấu: "den" ra "Đèn" (`normalizeSearch`).
- Form: rule giống `CreateCategoryDto` / `UpdateCategoryDto`. Slug trống khi tạo → backend tự sinh; khi sửa slug bắt buộc (backend không sinh lại, chuỗi rỗng bị 400). Danh mục cha không được là chính nó hoặc con cháu. Tạo mới không gửi field trống; sửa chỉ gửi field đã đổi, ô mô tả / ảnh xóa trắng gửi `null`.
- Xóa: backend trả 409 khi còn danh mục con / sản phẩm, nên dialog báo trước và không hiện nút xóa.
- Ảnh danh mục nhập bằng URL (backend chưa có API upload ảnh danh mục).

## Sản phẩm (`features/admin-products`)

- **Danh sách** (`/admin/products`): phân trang, tìm (`q`: tên hoặc SKU), lọc trạng thái / danh mục / nổi bật **ở server** (`GET /admin/products`). Bộ lọc danh mục khớp **đúng** danh mục đó, không gồm danh mục con (giới hạn của API). Dùng `keepPreviousData` nên đổi trang không nháy trống, bảng mờ đi trong lúc tải.
- Chọn nhiều dòng (giữ qua các trang) để xuất Excel theo `ids`; nút "Xuất tất cả" không gửi `ids`. Backend không mở header `Content-Disposition` qua CORS nên FE không đọc được tên file, tự đặt `products_YYYY_MM_DD.xlsx` (`api.download` + `saveFile` trong `lib/api-client.ts`).
- Nhập Excel: chỉ tạo sản phẩm mới, hiện kết quả theo dòng (`created`, `errors[].rows`).
- **Tạo**: dialog `ProductCreateDialog` ngay trên trang danh sách (không có trang riêng). Form sản phẩm + danh sách biến thể (ít nhất 1, tối đa 50; nhân bản biến thể giữ thuộc tính, xóa SKU). Bấm lưu bị lỗi thì mở hết biến thể đang thu gọn để thấy lỗi. Đang lọc theo danh mục thì danh mục đó được chọn sẵn. Đóng dialog khi đã nhập dữ liệu thì hỏi xác nhận trước khi bỏ. Tạo xong đóng dialog, toast có nút "Thêm ảnh" dẫn tới `/admin/products/[id]?tab=images` (ảnh chỉ upload được sau khi có sản phẩm).
- **Sửa** (`/admin/products/[id]`): 3 tab lưu trên URL (`?tab=info|variants|images`). Tab Thông tin `keepMounted` để chuyển tab không mất dữ liệu đang sửa; chỉ gửi field đã đổi (so sánh JSON cho mảng).
- Biến thể: sửa không gửi `stock` (backend 400); tồn kho đổi qua dialog riêng: "Nhập / xuất kho" (`adjust`, âm để trừ) hoặc "Kiểm kê" (`stock`). FE chặn trừ quá số đang có trước khi gọi API.
- Sản phẩm "Đang bán" phải còn ≥ 1 biến thể đang bán: khóa nút ngừng bán / xóa biến thể đang bán cuối cùng (backend 409). Form tạo cũng kiểm tra điều này.
- Ảnh: jpg / png / webp, ≤ 5MB, ≤ 10 ảnh mỗi lần, kiểm tra ở FE trước khi gửi. Upload / xóa trả lại cả danh sách ảnh → ghi thẳng vào cache chi tiết. Không có API đổi thứ tự ảnh: ảnh đầu là ảnh đại diện.
- Ô số trong form dùng `requiredNumber` (trống → `NaN` → báo "Nhập ...") hoặc `optionalNumber` (trống → `null`) từ `components/admin/number-input.tsx`.
- Lỗi 409 trùng slug gắn vào ô slug, trùng SKU (dialog biến thể) gắn vào ô SKU; còn lại qua `setServerErrors`.
- Form sản phẩm có chọn bộ sưu tập (`collectionIDs`, tối đa 20); danh sách lọc được theo bộ sưu tập (`?collection=` → `collectionID`).

## Bộ sưu tập (`features/admin-collections`)

- API chưa có trong `docs/api-docs`; đọc theo `backend/src/app/collections` và `backend/docs/code-notes/collections.md`.
- `GET /admin/collections` trả tất cả (không phân trang) → tìm / lọc / sắp xếp / phân trang ở client, lưu trên URL.
- Trạng thái hiển thị tính ở FE (`getCollectionState`) giống `visibleCollectionWhere` của backend: tắt → "Đang tắt"; `startsAt` sau hiện tại → "Sắp diễn ra"; `endsAt` ≤ hiện tại → "Đã kết thúc"; còn lại "Đang hiển thị".
- Thời gian nhập bằng `datetime-local` (giờ máy người dùng), gửi lên dạng ISO. Khi sửa chỉ gửi field đã đổi; so sánh thời gian theo chuỗi `yyyy-MM-ddTHH:mm` để không gửi nhầm vì lệch giây. Xóa trắng → gửi `null` (bỏ giới hạn).
- Ảnh bìa: 1 ảnh, upload riêng (`POST /admin/collections/:id/image`, field `file`). Lúc tạo mới, ảnh chọn trước được tải lên ngay sau khi tạo xong; lúc sửa, đổi / xóa ảnh có tác dụng ngay (không chờ bấm Lưu).
- Sản phẩm của bộ sưu tập: dialog 2 tab. "Đang có" = `GET /admin/products?collectionID=` (gỡ từng sản phẩm). "Thêm sản phẩm" = tìm trong toàn bộ sản phẩm, chọn nhiều (giữ qua các trang, tối đa 200 mỗi lần), sản phẩm đã có (theo `collectionIDs`) bị khóa.
- Xóa bộ sưu tập là xóa mềm; `collectionIDs` của sản phẩm vẫn giữ ID cũ nhưng backend chỉ trả bộ sưu tập chưa xóa.
- Kiểm tra file ảnh (loại, dung lượng) dùng chung `lib/image-files.ts` với ảnh sản phẩm.

## Đơn hàng (`features/admin-orders`)

- **Danh sách** (`/admin/orders`): tab theo trạng thái, tìm theo mã đơn **hoặc** email (chọn ở ô "tìm theo"; API nhận `orderNumber` / `email` riêng), lọc phương thức / trạng thái thanh toán, khoảng ngày đặt (`from` / `to` dạng `YYYY-MM-DD`, backend hiểu theo giờ VN, gồm cả ngày `to`). Phân trang ở server. Ngày "đến" trước ngày "từ" thì bỏ ngày "đến".
- Xuất Excel gửi đúng bộ lọc đang chọn (không phân trang); backend giới hạn 5000 đơn mỗi lần, quá thì báo lỗi (lọc hẹp khoảng ngày).
- **Chi tiết** (`/admin/orders/[id]`): sản phẩm là snapshot trong đơn (không gọi lại API sản phẩm), dòng hàng đặt làm (`stockReserved = false`) có nhãn "Đặt làm".
- Nút thao tác lấy từ `ORDER_TRANSITIONS` (`constants/orders.ts`, giống `backend/src/app/orders/order-status.ts`): nút chính là bước tiếp theo, "Hủy đơn" riêng. Trước khi chuyển, dialog liệt kê tác dụng phụ (`transitionEffects`: hoàn kho phần đã trừ, trả lượt mã, nhắc hoàn tiền khi đơn đã trả, COD giao xong thì tính đã trả, trả hàng không tự cộng kho). Hủy đơn bắt buộc nhập lý do ở FE (backend không bắt buộc) vì lý do gửi kèm email cho khách.
- "Xác nhận đã nhận tiền" (`mark-paid`) chỉ hiện với đơn chuyển khoản chưa trả, chưa hủy / trả hàng. Backend cho cả COD nhưng COD tự tính đã trả khi giao xong nên FE ẩn.
- `statusHistory[].changedBy`: email admin, `system` (cron tự hủy đơn quá hạn), `sepay` (webhook nhận tiền).
- Đổi trạng thái / xác nhận tiền xong thì làm mới cả đơn, giao dịch và sản phẩm (kho, số đã bán đổi).

## Thanh toán (`features/admin-payments`)

- `/admin/payments`: giao dịch SePay, tab "Cần đối soát" (`status=failed`) / "Đã khớp đơn" (`paid`), tìm theo mã đơn.
- Backend không lưu lý do không khớp, FE đoán từ dữ liệu hiện tại (`mismatchReason`): số tiền khác tổng đơn → "Sai số tiền"; đơn đã hủy / trả hàng → "Tiền về khi đơn đã hủy"; còn lại → "Chuyển trùng". Kèm việc nên làm (`suggestedAction`). Xử lý (xác nhận nhận tiền / hoàn tiền) làm ở trang chi tiết đơn.
- Dialog chi tiết hiện các field chính của payload SePay và JSON gốc.

## Bảng điều khiển (`features/admin-dashboard`)

- Một lần `GET /admin/dashboard` cho kỳ đang xem + một lần cho **kỳ liền trước cùng số ngày** (`previousRange`) để tính % thay đổi ở 4 ô KPI. Kỳ trước bằng 0 thì ghi "Kỳ trước chưa có số liệu". Đơn hủy tăng là xấu (`upIsGood={false}`).
- Khoảng ngày: 7 / 30 / 90 ngày, tháng này, tùy chọn (`?range=&from=&to=`, tối đa 366 ngày như backend). Ngày tính theo máy admin (giờ VN), gửi `YYYY-MM-DD`.
- Biểu đồ doanh thu: cột 1 màu (`--chart-1`), cột tối đa 24px, bo 4px đầu cột, lưới ngang mảnh; tooltip ngày + doanh thu + số đơn; nút "Bảng" để xem số liệu dạng bảng. Khoảng > 92 ngày thì gộp theo tuần (thứ Hai đầu tuần) cho đỡ dày.
- Đơn theo trạng thái / sản phẩm bán chạy dùng danh sách có thanh (meter list), 1 màu, không dùng biểu đồ tròn. Mỗi dòng trạng thái dẫn sang danh sách đơn đã lọc đúng trạng thái + khoảng ngày.
- "Cần xử lý": đơn chờ xác nhận (tổng, không theo khoảng ngày), giao dịch cần đối soát (trong khoảng), hàng sắp hết (ngưỡng chọn được: hết hàng / ≤ 5 / 10 / 20, `?low=`), dẫn thẳng sang tab Biến thể của sản phẩm.
- Badge số đơn chờ xác nhận trên mục "Đơn hàng" ở sidebar: `GET /admin/orders?status=pending&itemPerPage=1` lấy `totalItems` (nhẹ hơn gọi dashboard), tự làm mới mỗi 60 giây và sau mỗi thao tác đơn.
- `StatTile` (`components/admin/stat-tile.tsx`) dùng lại được cho các trang khác.
