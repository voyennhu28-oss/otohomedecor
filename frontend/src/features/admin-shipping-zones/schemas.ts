import { z } from 'zod';

import { PROVINCES, type Province } from '@/constants/shipping';
import type {
  ShippingZone,
  ShippingZoneInput,
  UpdateShippingZoneInput,
} from '@/features/shipping-zones/types';

const money = (label: string) =>
  z
    .number(`Nhập ${label}`)
    .int(`${label[0].toUpperCase()}${label.slice(1)} là số nguyên`)
    .min(0, 'Không được âm');

export const zoneFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nhập tên vùng')
    .max(100, 'Tên tối đa 100 ký tự'),
  provinces: z
    .array(z.enum(PROVINCES as unknown as [Province, ...Province[]]))
    .min(1, 'Chọn ít nhất 1 tỉnh / thành'),
  baseFee: money('phí cơ bản'),
  baseWeightKg: z
    .number('Nhập khối lượng tính phí cơ bản')
    .positive('Phải lớn hơn 0')
    .max(1000, 'Tối đa 1000kg'),
  feePerKg: money('phí mỗi kg'),
  bulkySurcharge: money('phụ phí cồng kềnh'),
  freeShipThreshold: z
    .number()
    .int('Là số nguyên')
    .min(1, 'Phải lớn hơn 0')
    .nullable(),
  estimatedDays: z
    .number('Nhập số ngày giao')
    .int('Số ngày là số nguyên')
    .min(1, 'Tối thiểu 1 ngày')
    .max(60, 'Tối đa 60 ngày'),
  isActive: z.boolean(),
});

export type ZoneFormValues = z.infer<typeof zoneFormSchema>;

export const ZONE_FORM_FIELDS = [
  'name',
  'provinces',
  'baseFee',
  'baseWeightKg',
  'feePerKg',
  'bulkySurcharge',
  'freeShipThreshold',
  'estimatedDays',
  'isActive',
] as const;

export function toZoneFormValues(zone?: ShippingZone | null): ZoneFormValues {
  return {
    name: zone?.name ?? '',
    provinces: zone?.provinces ?? [],
    baseFee: zone?.baseFee ?? Number.NaN,
    baseWeightKg: zone?.baseWeightKg ?? Number.NaN,
    feePerKg: zone?.feePerKg ?? Number.NaN,
    bulkySurcharge: zone?.bulkySurcharge ?? 0,
    freeShipThreshold: zone?.freeShipThreshold ?? null,
    estimatedDays: zone?.estimatedDays ?? Number.NaN,
    isActive: zone?.isActive ?? true,
  };
}

const byProvinceOrder = (list: Province[]) =>
  PROVINCES.filter((province) => list.includes(province));

export function toZoneInput(values: ZoneFormValues): ShippingZoneInput {
  return { ...values, provinces: byProvinceOrder(values.provinces) };
}

export function toUpdateZoneInput(
  values: ZoneFormValues,
  original: ShippingZone,
): UpdateShippingZoneInput {
  const next = toZoneInput(values);
  const body: UpdateShippingZoneInput = {};
  for (const key of ZONE_FORM_FIELDS) {
    const changed =
      key === 'provinces'
        ? JSON.stringify(next.provinces) !==
          JSON.stringify(byProvinceOrder(original.provinces))
        : next[key] !== original[key];
    if (changed) Object.assign(body, { [key]: next[key] });
  }
  return body;
}
