# Module `dashboard` (src/app/dashboard)

## `src/app/dashboard/admin-dashboard.controller.ts`

- **AdminDashboardController › getOverview**: Doanh thu theo ngày, số đơn theo trạng thái, top sản phẩm, hàng sắp hết, việc cần xử lý.

## `src/app/dashboard/dashboard-range.ts`

- **resolveRange**: Khoảng thời gian của dashboard. Thiếu `to` → hết hôm nay (giờ VN);
  thiếu `from` → 30 ngày tính tới `to` (gồm cả ngày `to`).
- **listVnDates**: Mọi ngày (YYYY-MM-DD, giờ VN) trong khoảng: để biểu đồ có cả ngày không có đơn.
- **fillDaily**: Doanh thu theo ngày, điền 0 cho ngày không có đơn.

## `src/app/dashboard/dashboard.module.ts`

- **DashboardModule**: Chỉ có phía admin, không có collection riêng.

## `src/app/dashboard/dashboard.service.spec.ts`

- **describe('dashboard-range') › it('mặc định: 30 ngày tới hết hôm nay theo giờ VN') › { from, to }**: 2026-11-13 18:00 UTC = 2026-11-14 01:00 giờ VN → "hôm nay" là 14/11
- **describe('dashboard-range') › it('mặc định: 30 ngày tới hết hôm nay theo giờ VN')** (`expect(from.toISOString()).toBe('2026-10-15T17:00:00.000Z');`): 00:00 ngày 16/10 giờ VN

## `src/app/dashboard/dto/dashboard.dto.ts`

- **DashboardQueryDto**: GET /admin/dashboard?from=2026-11-01&to=2026-11-30&lowStockThreshold=5&topLimit=10
  Ngày tính theo giờ Việt Nam. Không gửi from / to: 30 ngày gần nhất (gồm hôm nay).
