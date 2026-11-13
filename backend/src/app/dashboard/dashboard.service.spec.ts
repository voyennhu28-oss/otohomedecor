import { OrderStatus } from '@prisma/client';
import { rawDate, rawId, rawNumber } from '../../common/prisma/raw.util';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { ProductVariantsService } from '../product-variants/product-variants.service';
import { fillDaily, listVnDates, resolveRange } from './dashboard-range';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard.dto';

const byStatus = (overrides: Partial<Record<OrderStatus, number>> = {}) =>
  Object.fromEntries(Object.values(OrderStatus).map((s) => [s, overrides[s] ?? 0])) as Record<OrderStatus, number>;

describe('dashboard-range', () => {
  it('mặc định: 30 ngày tới hết hôm nay theo giờ VN', () => {
    // 2026-11-13 18:00 UTC = 2026-11-14 01:00 giờ VN → "hôm nay" là 14/11
    const { from, to } = resolveRange(undefined, undefined, new Date('2026-11-13T18:00:00Z'));
    expect(to.toISOString()).toBe('2026-11-14T16:59:59.999Z');
    expect(from.toISOString()).toBe('2026-10-15T17:00:00.000Z'); // 00:00 ngày 16/10 giờ VN
    expect(listVnDates(from, to)).toHaveLength(30);
  });

  it('chỉ có to → 30 ngày tính tới to; có đủ thì giữ nguyên', () => {
    const to = new Date('2026-11-30T16:59:59.999Z');
    expect(listVnDates(resolveRange(undefined, to).from, to)[0]).toBe('2026-11-01');
    const from = new Date('2026-11-01T00:00:00+07:00');
    expect(resolveRange(from, to)).toEqual({ from, to });
  });

  it('listVnDates qua tháng / năm; fillDaily điền 0 cho ngày không có đơn', () => {
    const dates = listVnDates(new Date('2026-12-30T00:00:00+07:00'), new Date('2027-01-02T23:59:59+07:00'));
    expect(dates).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
    expect(fillDaily(dates.slice(0, 2), [{ date: '2026-12-31', revenue: 5, orders: 1 }])).toEqual([
      { date: '2026-12-30', revenue: 0, orders: 0 },
      { date: '2026-12-31', revenue: 5, orders: 1 },
    ]);
  });
});

describe('raw.util (kết quả aggregateRaw)', () => {
  it('rawNumber: number / $numberLong / $numberInt / $numberDouble; không hợp lệ → 0', () => {
    expect(rawNumber(5)).toBe(5);
    expect(rawNumber({ $numberLong: '12345678901' })).toBe(12_345_678_901);
    expect(rawNumber({ $numberInt: '7' })).toBe(7);
    expect(rawNumber({ $numberDouble: '1.5' })).toBe(1.5);
    expect(rawNumber(null)).toBe(0);
  });

  it('rawId / rawDate', () => {
    expect(rawId({ $oid: 'aaaaaaaaaaaaaaaaaaaaaaaa' })).toBe('aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(rawId('abc')).toBe('abc');
    expect(rawDate(new Date('2026-11-13T00:00:00Z'))).toEqual({ $date: '2026-11-13T00:00:00.000Z' });
  });
});

describe('DashboardQueryDto', () => {
  it('mặc định ngưỡng hàng sắp hết 5, top 10; ngày hiểu theo giờ VN', () => {
    const q = DashboardQueryDto.schema.parse({ from: '2026-11-01', to: '2026-11-30' });
    expect(q).toMatchObject({ lowStockThreshold: 5, topLimit: 10 });
    expect(q.from?.toISOString()).toBe('2026-10-31T17:00:00.000Z');
  });

  it('from sau to / quá 366 ngày → lỗi', () => {
    expect(DashboardQueryDto.schema.safeParse({ from: '2026-11-02', to: '2026-11-01' }).success).toBe(false);
    expect(DashboardQueryDto.schema.safeParse({ from: '2025-01-01', to: '2026-11-01' }).success).toBe(false);
  });
});

describe('DashboardService', () => {
  const orders = { salesReport: jest.fn(), countPending: jest.fn() };
  const variants = { findLowStock: jest.fn() };
  const payments = { countFailed: jest.fn() };
  const service = new DashboardService(
    orders as unknown as OrdersService,
    variants as unknown as ProductVariantsService,
    payments as unknown as PaymentsService,
  );

  beforeEach(() => {
    orders.salesReport.mockResolvedValue({
      daily: [
        { date: '2026-11-01', revenue: 3_000_000, orders: 2 },
        { date: '2026-11-03', revenue: 1_500_000, orders: 1 },
      ],
      topProducts: [{ productID: 'p1', name: 'Sofa', quantity: 3, revenue: 4_500_000 }],
      byStatus: byStatus({ pending: 1, delivered: 2, cancelled: 4 }),
    });
    orders.countPending.mockResolvedValue(7);
    payments.countFailed.mockResolvedValue(2);
    variants.findLowStock.mockResolvedValue([{ sku: 'A', stock: 1 }]);
  });

  it('ghép số liệu: tổng doanh thu, số đơn, giá trị đơn trung bình, đủ ngày, việc cần xử lý', async () => {
    const from = new Date('2026-11-01T00:00:00+07:00');
    const to = new Date('2026-11-03T23:59:59.999+07:00');
    const result = await service.getOverview({ from, to, lowStockThreshold: 3, topLimit: 5 });

    expect(orders.salesReport).toHaveBeenCalledWith({ from, to }, 5);
    expect(payments.countFailed).toHaveBeenCalledWith({ from, to });
    expect(variants.findLowStock).toHaveBeenCalledWith(3, 20);
    expect(result.summary).toEqual({ revenue: 4_500_000, orders: 3, averageOrderValue: 1_500_000, cancelledOrders: 4 });
    expect(result.revenueByDay).toEqual([
      { date: '2026-11-01', revenue: 3_000_000, orders: 2 },
      { date: '2026-11-02', revenue: 0, orders: 0 },
      { date: '2026-11-03', revenue: 1_500_000, orders: 1 },
    ]);
    expect(result.needsAttention).toEqual({ pendingOrders: 7, failedPayments: 2, lowStockThreshold: 3, lowStock: [{ sku: 'A', stock: 1 }] });
    expect(result.topProducts).toHaveLength(1);
  });

  it('không có đơn → giá trị trung bình 0 (không chia cho 0)', async () => {
    orders.salesReport.mockResolvedValue({ daily: [], topProducts: [], byStatus: byStatus() });
    const result = await service.getOverview({ lowStockThreshold: 5, topLimit: 10 });
    expect(result.summary).toEqual({ revenue: 0, orders: 0, averageOrderValue: 0, cancelledOrders: 0 });
    expect(result.revenueByDay).toHaveLength(30);
  });
});
