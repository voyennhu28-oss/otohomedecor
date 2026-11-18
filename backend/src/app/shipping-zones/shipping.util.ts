import type { Dimensions, ShippingZone } from '@prisma/client';

export const BULKY_WEIGHT_KG = 30;
export const BULKY_LENGTH_CM = 150;
const VOLUMETRIC_DIVISOR = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ShippingLine {
  quantity: number;
  weightKg: number;
  dimensions?: Dimensions | null;
}

export type ShippingRates = Pick<
  ShippingZone,
  | 'baseFee'
  | 'baseWeightKg'
  | 'feePerKg'
  | 'bulkySurcharge'
  | 'freeShipThreshold'
>;

export const volumetricKg = (d?: Dimensions | null) =>
  d ? (d.lengthCm * d.widthCm * d.heightCm) / VOLUMETRIC_DIVISOR : 0;

export const chargeableKg = (line: ShippingLine) =>
  Math.max(line.weightKg, volumetricKg(line.dimensions));

export const isBulky = (line: ShippingLine) => {
  const d = line.dimensions;
  const longest = d ? Math.max(d.lengthCm, d.widthCm, d.heightCm) : 0;
  return chargeableKg(line) >= BULKY_WEIGHT_KG || longest >= BULKY_LENGTH_CM;
};

export const calculateShippingFee = (
  zone: ShippingRates,
  lines: ShippingLine[],
  subtotal: number,
): number => {
  const bulky = lines.some(isBulky);
  if (
    !bulky &&
    zone.freeShipThreshold != null &&
    subtotal >= zone.freeShipThreshold
  )
    return 0;

  const totalKg =
    Math.round(
      lines.reduce((sum, l) => sum + chargeableKg(l) * l.quantity, 0) * 1000,
    ) / 1000;
  const extraKg = Math.max(0, Math.ceil(totalKg - zone.baseWeightKg));
  return (
    zone.baseFee + extraKg * zone.feePerKg + (bulky ? zone.bulkySurcharge : 0)
  );
};

export const estimateDeliveryDate = (
  estimatedDays: number,
  leadTimes: number[],
  now = new Date(),
): Date =>
  new Date(
    now.getTime() + (estimatedDays + Math.max(0, ...leadTimes)) * DAY_MS,
  );
