import {
  calculateShippingFee,
  chargeableKg,
  estimateDeliveryDate,
  isBulky,
  ShippingRates,
  volumetricKg,
} from './shipping.util';

const zone: ShippingRates = {
  baseFee: 30_000,
  baseWeightKg: 5,
  feePerKg: 5_000,
  bulkySurcharge: 200_000,
  freeShipThreshold: 5_000_000,
};
const box = (lengthCm: number, widthCm: number, heightCm: number) => ({ lengthCm, widthCm, heightCm });

describe('shipping.util', () => {
  describe('cân nặng tính cước', () => {
    it('cân quy đổi = thể tích / 5000; không có kích thước = 0', () => {
      expect(volumetricKg(box(100, 50, 40))).toBe(40);
      expect(volumetricKg(null)).toBe(0);
    });

    it('lấy số lớn hơn giữa cân thật và cân quy đổi', () => {
      expect(chargeableKg({ quantity: 1, weightKg: 10, dimensions: box(100, 50, 40) })).toBe(40); // gối to, nhẹ
      expect(chargeableKg({ quantity: 1, weightKg: 25, dimensions: box(20, 20, 20) })).toBe(25); // nhỏ, nặng
    });

    it('cồng kềnh: từ 30kg (quy đổi) hoặc cạnh dài từ 150cm', () => {
      expect(isBulky({ quantity: 1, weightKg: 30 })).toBe(true);
      expect(isBulky({ quantity: 1, weightKg: 29.9 })).toBe(false);
      expect(isBulky({ quantity: 1, weightKg: 5, dimensions: box(150, 10, 10) })).toBe(true);
      expect(isBulky({ quantity: 1, weightKg: 5, dimensions: box(149, 10, 10) })).toBe(false);
    });
  });

  describe('calculateShippingFee', () => {
    it('trong baseWeightKg đầu: chỉ phí cơ bản', () => {
      expect(calculateShippingFee(zone, [{ quantity: 2, weightKg: 2.5 }], 1_000_000)).toBe(30_000);
    });

    it('mỗi kg tiếp theo làm tròn lên', () => {
      // 2 × 3.2kg = 6.4kg → vượt 1.4kg → tính 2kg
      expect(calculateShippingFee(zone, [{ quantity: 2, weightKg: 3.2 }], 1_000_000)).toBe(40_000);
    });

    it('không bị lỗi số thực khi cộng (0.1 × 3 không thành 0.30000000000000004)', () => {
      const rates = { ...zone, baseWeightKg: 0.3 };
      expect(calculateShippingFee(rates, [{ quantity: 3, weightKg: 0.1 }], 0)).toBe(30_000);
    });

    it('đủ ngưỡng free ship (và không có hàng cồng kềnh) → 0', () => {
      expect(calculateShippingFee(zone, [{ quantity: 1, weightKg: 20 }], 5_000_000)).toBe(0);
      expect(calculateShippingFee(zone, [{ quantity: 1, weightKg: 20 }], 4_999_999)).toBeGreaterThan(0);
    });

    it('có hàng cồng kềnh: không free ship dù đủ ngưỡng, cộng phụ phí', () => {
      const sofa = { quantity: 1, weightKg: 45, dimensions: box(210, 90, 80) }; // quy đổi 302.4kg
      // 302.4 - 5 = 297.4 → 298kg × 5.000 + 30.000 + 200.000
      expect(calculateShippingFee(zone, [sofa], 50_000_000)).toBe(30_000 + 298 * 5_000 + 200_000);
    });

    it('vùng không có ngưỡng free ship thì luôn tính phí', () => {
      expect(calculateShippingFee({ ...zone, freeShipThreshold: null }, [{ quantity: 1, weightKg: 1 }], 99_000_000)).toBe(
        30_000,
      );
    });
  });

  describe('estimateDeliveryDate', () => {
    const now = new Date('2026-11-13T03:00:00Z');
    const days = (d: Date) => Math.round((d.getTime() - now.getTime()) / 86_400_000);

    it('hàng có sẵn: hôm nay + số ngày vận chuyển', () => {
      expect(days(estimateDeliveryDate(3, [0, 0], now))).toBe(3);
    });

    it('có hàng đặt làm: cộng thời gian sản xuất lâu nhất', () => {
      expect(days(estimateDeliveryDate(3, [0, 14, 7], now))).toBe(17);
    });

    it('không có dòng nào vẫn tính được', () => {
      expect(days(estimateDeliveryDate(2, [], now))).toBe(2);
    });
  });
});
