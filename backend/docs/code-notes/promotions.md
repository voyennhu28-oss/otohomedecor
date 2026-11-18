# Module `promotions` (src/app/promotions)

## `src/app/promotions/dto/promotion.dto.ts`

- **promotionCodeSchema**: "welcome10" → "WELCOME10"
- **fields › value** (`value: z.number().int().min(0),`): % (1–100) hoặc số tiền VND; free_shipping bỏ qua
- **fields › maxDiscount** (`maxDiscount: z.number().int().min(1).nullable(),`): trần tiền giảm, chỉ cho loại %
- **fields › usageLimit** (`usageLimit: z.number().int().min(1).nullable(),`): tổng lượt dùng, null = không giới hạn
- **CreatePromotionDto**: POST /admin/promotions
- **UpdatePromotionDto**: PATCH /admin/promotions/:id. Rule giữa các field kiểm tra trong service (cần giá trị hiện tại).
- **PromotionListQueryDto**: GET /admin/promotions?q=&isActive=&page=&itemPerPage=
- **PromotionListQueryDto › q** (`q: searchQuery.optional(),`): tìm theo mã hoặc tên

## `src/app/promotions/promotion.util.ts`

- **computeDiscount**: Số tiền giảm (VND, plan mục 10):
   - percentage: subtotal × value%, làm tròn xuống, tối đa maxDiscount
   - fixed_amount: value, không vượt quá subtotal
   - free_shipping: bằng phí ship
- **getUnusableReason**: Lý do mã KHÔNG dùng được cho đơn này, hoặc null nếu dùng được.
  @param usedByUser số đơn chưa hủy của user đã dùng mã này
- **getRuleViolation**: Lỗi cấu hình mã (admin nhập), hoặc null nếu hợp lệ. Dùng cho cả tạo mới và sửa.
- **normalizeRules**: Chuẩn hóa field không áp dụng cho loại mã: free_shipping không có value,
  chỉ loại percentage mới có maxDiscount.

## `src/app/promotions/promotions.module.ts`

- **PromotionsModule › exports** (`exports: [PromotionsService],`): checkout áp mã, orders trả lượt khi hủy

## `src/app/promotions/promotions.service.spec.ts`

- **describe('PromotionsService') › describe('checkout') › it('findApplicable: tìm theo mã viết hoa, chưa xóa')** (`expect(countUserUsage).not.toHaveBeenCalled();`): mã không giới hạn theo user

## `src/app/promotions/promotions.service.ts`

- **ApplyContext › countUserUsage**: Số đơn chưa hủy của user đã dùng mã (chỉ gọi khi mã có perUserLimit).
- **PromotionsService › remove**: Soft delete, đổi code thành "<code>--deleted-<id>" để dùng lại được mã.
  Đơn hàng cũ lưu sẵn promotionCode nên không bị ảnh hưởng.
- **PromotionsService › findApplicable**: Mã dùng được cho đơn này, ném 400 kèm lý do nếu không.
- **PromotionsService › consume**: Tăng usedCount ATOMIC: chỉ tăng khi còn lượt (2 đơn cùng lúc không vượt usageLimit).
- **PromotionsService › release**: Trả lại 1 lượt khi hủy đơn (không xuống dưới 0, kể cả mã đã bị xóa).
- **PromotionsService › assertCodeAvailable**: Dùng client gốc: index @unique của code tính cả mã đã xóa.
