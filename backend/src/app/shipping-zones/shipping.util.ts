import type { Dimensions, ShippingZone } from '@prisma/client';

/** Hàng cồng kềnh: 1 sản phẩm nặng (quy đổi) từ 30kg hoặc có cạnh dài từ 150cm. */
export const BULKY_WEIGHT_KG = 30;
export const BULKY_LENGTH_CM = 150;
/** Trọng lượng quy đổi = thể tích (cm³) / 5000, chuẩn của các hãng vận chuyển. */
const VOLUMETRIC_DIVISOR = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ShippingLine {
  quantity: number;
  weightKg: number;
  dimensions?: Dimensions | null;
}

export type ShippingRates = Pick<
  ShippingZone,
  'baseFee' | 'baseWeightKg' | 'feePerKg' | 'bulkySurcharge' | 'freeShipThreshold'
>;

export const volumetricKg = (d?: Dimensions | null) =>
  d ? (d.lengthCm * d.widthCm * d.heightCm) / VOLUMETRIC_DIVISOR : 0;

/** Cân nặng tính cước của 1 sản phẩm: lấy số lớn hơn giữa cân thật và cân quy đổi. */
export const chargeableKg = (line: ShippingLine) =>
  Math.max(line.weightKg, volumetricKg(line.dimensions));

export const isBulky = (line: ShippingLine) => {
  const d = line.dimensions;
  const longest = d ? Math.max(d.lengthCm, d.widthCm, d.heightCm) : 0;
  return chargeableKg(line) >= BULKY_WEIGHT_KG || longest >= BULKY_LENGTH_CM;
};

/**
 * Phí ship (VND, plan mục 9):
 *  - Đơn có hàng cồng kềnh: không free ship, cộng phụ phí cồng kềnh.
 *  - Còn lại: subtotal >= freeShipThreshold thì miễn phí.
 *  - Phí = phí cơ bản (cho baseWeightKg đầu) + mỗi kg tiếp theo (làm tròn lên) × feePerKg.
 */
export const calculateShippingFee = (
  zone: ShippingRates,
  lines: ShippingLine[],
  subtotal: number,
): number => {
  const bulky = lines.some(isBulky);
  if (!bulky && zone.freeShipThreshold != null && subtotal >= zone.freeShipThreshold) return 0;

  // Làm tròn 3 số lẻ trước khi ceil để tránh lỗi số thực (0.1 + 0.2 = 0.30000000000000004)
  const totalKg = Math.round(lines.reduce((sum, l) => sum + chargeableKg(l) * l.quantity, 0) * 1000) / 1000;
  const extraKg = Math.max(0, Math.ceil(totalKg - zone.baseWeightKg));
  return zone.baseFee + extraKg * zone.feePerKg + (bulky ? zone.bulkySurcharge : 0);
};

/**
 * Ngày giao dự kiến = hôm nay + số ngày vận chuyển của vùng + thời gian sản xuất lâu nhất
 * của các dòng hàng đặt làm (leadTimeDays, 0 nếu có sẵn hàng).
 */
export const estimateDeliveryDate = (
  estimatedDays: number,
  leadTimes: number[],
  now = new Date(),
): Date => new Date(now.getTime() + (estimatedDays + Math.max(0, ...leadTimes)) * DAY_MS);
