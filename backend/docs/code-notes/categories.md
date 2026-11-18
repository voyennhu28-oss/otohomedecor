# Module `categories` (src/app/categories)

## `src/app/categories/categories.module.ts`

- **CategoriesModule › exports** (`exports: [CategoriesService],`): products dùng để lọc theo danh mục (gồm con cháu)

## `src/app/categories/categories.service.spec.ts`

- **(đầu file)**: Cây mẫu:  phong-khach ─┬─ sofa ── sofa-goc
  └─ ban-tra
- **cat**: phong-ngu (đang ẩn) ── giuong
- **GIUONG** (`const GIUONG = cat('giuong', 'giuong', 'pn');`): cha "pn" đang ẩn nên không có trong danh sách active
- **describe('CategoriesService') › describe('public') › it('getPublicTree: dựng cây lồng nhau, chỉ lấy danh mục đang hiển thị')** (`expect(tree.map((c) => c.slug)).toEqual(['phong-khach']);`): "giuong" bị bỏ vì cha đang ẩn
- **describe('CategoriesService') › describe('create') › it('tự sinh slug từ tên tiếng Việt')** (`model.findMany.mockResolvedValue([]);`): chưa có slug nào trùng

## `src/app/categories/categories.service.ts`

- **COUNT_NOT_DELETED**: Chỉ đếm sản phẩm / danh mục con chưa bị xóa.
- **CategoriesService › getPublicTree**: Cây danh mục đang hiển thị. Danh mục con của danh mục đang ẩn cũng bị ẩn.
- **CategoriesService › getPublicBySlug**: Chi tiết + breadcrumb + danh mục con. 404 nếu nó hoặc một tổ tiên đang ẩn.
- **CategoriesService › getActiveIDsWithDescendants**: ID của danh mục (theo slug) và mọi danh mục con cháu đang hiển thị.
  Products dùng để lọc "sản phẩm thuộc danh mục, gồm cả danh mục con" (plan mục 8).
- **CategoriesService › getAdminTree**: Cây đầy đủ (cả danh mục đang ẩn), kèm số sản phẩm.
- **CategoriesService › remove**: Soft delete, đồng thời đổi slug để giải phóng slug cũ (slug là @unique,
- **CategoriesService › remove**: index vẫn tính cả bản ghi đã xóa) → tạo lại danh mục cùng tên vẫn được.
- **CategoriesService › findIDsBySlugs**: slug → id của các danh mục chưa xóa (mọi trạng thái). Dùng cho import Excel sản phẩm.
- **CategoriesService › ensureExists**: Ném 404 nếu danh mục không tồn tại hoặc đã bị xóa. Products dùng khi gán categoryID.
- **CategoriesService › assertValidParent**: Cha phải tồn tại, không phải chính nó, không phải con cháu của nó (tránh vòng lặp).
  `id` = null khi tạo mới.
- **CategoriesService › assertSlugAvailable**: Dùng client gốc vì index @unique của slug tính cả bản ghi đã xóa.
- **CategoriesService › generateUniqueSlug**: "Bàn trà" → "ban-tra"; đã có thì "ban-tra-2", "ban-tra-3"...

## `src/app/categories/category-tree.util.ts`

- **buildTree**: Dựng cây từ danh sách phẳng (giữ nguyên thứ tự đầu vào).
  Node có cha không nằm trong danh sách (vd cha đang ẩn) bị bỏ cùng cả nhánh con.
- **getAncestors**: Chuỗi tổ tiên từ gốc tới cha trực tiếp. Trả null nếu đứt giữa chừng
  (một tổ tiên không có trong `byID`, vd đang ẩn) hoặc dữ liệu bị vòng lặp.
- **getDescendantIDs**: ID của node và toàn bộ con cháu.

## `src/app/categories/dto/category.dto.ts`

- **CreateCategoryDto**: POST /admin/categories. Không gửi slug thì tự sinh từ name. parentID null/không gửi = danh mục gốc.
- **UpdateCategoryDto**: PATCH /admin/categories/:id. Đổi name KHÔNG tự đổi slug (giữ link cũ / SEO).
- **UpdateCategoryDto › parentID** (`parentID: objectId.nullable().optional(),`): null = chuyển lên làm danh mục gốc
