import { PROVINCES, type Province } from '@/constants/shipping';
import type { ShippingZone } from '@/features/shipping-zones/types';
import { formatVND } from '@/lib/format';

type FeeRule = Pick<
  ShippingZone,
  | 'baseFee'
  | 'baseWeightKg'
  | 'feePerKg'
  | 'bulkySurcharge'
  | 'freeShipThreshold'
>;

export function estimateShippingFee(
  zone: FeeRule,
  {
    weightKg,
    subtotal,
    bulky,
  }: { weightKg: number; subtotal: number; bulky: boolean },
) {
  if (
    !bulky &&
    zone.freeShipThreshold !== null &&
    subtotal >= zone.freeShipThreshold
  ) {
    return { fee: 0, extraKg: 0, free: true };
  }
  const extraKg = Math.max(0, Math.ceil(weightKg - zone.baseWeightKg));
  const fee =
    zone.baseFee + extraKg * zone.feePerKg + (bulky ? zone.bulkySurcharge : 0);
  return { fee, extraKg, free: false };
}

export function describeFee(zone: FeeRule) {
  const base = `${formatVND(zone.baseFee)} cho ${zone.baseWeightKg.toLocaleString('vi-VN')}kg đầu`;
  return zone.feePerKg > 0
    ? `${base}, thêm ${formatVND(zone.feePerKg)}/kg`
    : base;
}

export function provinceOwners(
  zones: Pick<ShippingZone, 'id' | 'name' | 'provinces' | 'isActive'>[],
  exceptID?: string,
) {
  const owners = new Map<Province, string>();
  for (const zone of zones) {
    if (!zone.isActive || zone.id === exceptID) continue;
    for (const province of zone.provinces) owners.set(province, zone.name);
  }
  return owners;
}

export function coverage(
  zones: Pick<ShippingZone, 'id' | 'name' | 'provinces' | 'isActive'>[],
) {
  const owners = provinceOwners(zones);
  const uncovered = PROVINCES.filter((province) => !owners.has(province));
  return {
    covered: PROVINCES.length - uncovered.length,
    total: PROVINCES.length,
    uncovered,
  };
}

export function conflictMessage(
  provinces: Province[],
  owners: Map<Province, string>,
) {
  const conflicts = provinces
    .filter((province) => owners.has(province))
    .map((province) => `${province} (vùng "${owners.get(province)}")`);
  return conflicts.length
    ? `Tỉnh đã thuộc vùng khác đang hoạt động: ${conflicts.join('; ')}`
    : null;
}
