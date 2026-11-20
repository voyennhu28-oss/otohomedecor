import { describe, expect, it } from 'vitest';

import {
  toUpdateZoneInput,
  toZoneFormValues,
  toZoneInput,
  zoneFormSchema,
} from '@/features/admin-shipping-zones/schemas';
import {
  conflictMessage,
  coverage,
  estimateShippingFee,
  provinceOwners,
} from '@/features/admin-shipping-zones/zone-rules';
import type { ShippingZone } from '@/features/shipping-zones/types';

const zone = (patch: Partial<ShippingZone> = {}): ShippingZone => ({
  id: 'z1',
  name: 'Miền Nam',
  provinces: ['Hồ Chí Minh', 'Cần Thơ'],
  baseFee: 30_000,
  baseWeightKg: 5,
  feePerKg: 5_000,
  bulkySurcharge: 200_000,
  freeShipThreshold: 5_000_000,
  estimatedDays: 2,
  isActive: true,
  createdAt: '',
  updatedAt: '',
  ...patch,
});

describe('estimateShippingFee', () => {
  it('phí cơ bản + mỗi kg vượt (làm tròn lên)', () => {
    expect(
      estimateShippingFee(zone(), {
        weightKg: 7.2,
        subtotal: 1_000_000,
        bulky: false,
      }),
    ).toEqual({ fee: 45_000, extraKg: 3, free: false });
    expect(
      estimateShippingFee(zone(), {
        weightKg: 3,
        subtotal: 1_000_000,
        bulky: false,
      }).fee,
    ).toBe(30_000);
  });

  it('free ship khi đủ ngưỡng, trừ khi có hàng cồng kềnh', () => {
    expect(
      estimateShippingFee(zone(), {
        weightKg: 10,
        subtotal: 6_000_000,
        bulky: false,
      }),
    ).toMatchObject({ fee: 0, free: true });
    expect(
      estimateShippingFee(zone(), {
        weightKg: 5,
        subtotal: 6_000_000,
        bulky: true,
      }).fee,
    ).toBe(230_000);
  });
});

describe('độ phủ và trùng tỉnh', () => {
  const zones = [
    zone(),
    zone({
      id: 'z2',
      name: 'Miền Bắc',
      provinces: ['Hà Nội'],
      isActive: false,
    }),
  ];

  it('chỉ tính vùng đang hoạt động', () => {
    const result = coverage(zones);
    expect(result.covered).toBe(2);
    expect(result.uncovered).toContain('Hà Nội');
    expect(result.total).toBe(34);
  });

  it('báo tỉnh đã thuộc vùng khác, bỏ qua chính vùng đang sửa', () => {
    expect(conflictMessage(['Hồ Chí Minh', 'Huế'], provinceOwners(zones))).toBe(
      'Tỉnh đã thuộc vùng khác đang hoạt động: Hồ Chí Minh (vùng "Miền Nam")',
    );
    expect(
      conflictMessage(['Hồ Chí Minh'], provinceOwners(zones, 'z1')),
    ).toBeNull();
  });
});

describe('zone form', () => {
  it('bắt buộc chọn tỉnh và nhập phí', () => {
    const result = zoneFormSchema.safeParse({
      ...toZoneFormValues(),
      name: 'Miền Trung',
    });
    const paths = result.error?.issues.map((issue) => issue.path[0]);
    expect(paths).toEqual(
      expect.arrayContaining([
        'provinces',
        'baseFee',
        'baseWeightKg',
        'estimatedDays',
      ]),
    );
  });

  it('gửi tỉnh theo thứ tự chuẩn, sửa chỉ gửi field đã đổi', () => {
    const original = zone();
    const values = {
      ...toZoneFormValues(original),
      provinces: ['Cần Thơ', 'Hồ Chí Minh'] as ShippingZone['provinces'],
    };
    expect(toZoneInput(values).provinces).toEqual(['Hồ Chí Minh', 'Cần Thơ']);
    expect(toUpdateZoneInput(values, original)).toEqual({});
    expect(
      toUpdateZoneInput(
        { ...values, freeShipThreshold: null, feePerKg: 6_000 },
        original,
      ),
    ).toEqual({ feePerKg: 6_000, freeShipThreshold: null });
  });
});
