import { describe, expect, it } from 'vitest';

import {
  hasOrderFilters,
  ORDER_FILTER_DEFAULTS,
  toOrderFilter,
  toOrderQuery,
} from '@/features/admin-orders/filters';
import {
  canMarkPaid,
  formatAddress,
  getNextStatuses,
  transitionEffects,
} from '@/features/admin-orders/order-actions';
import type { Order } from '@/features/orders/types';

const order = (patch: Partial<Order> = {}) =>
  ({
    status: 'pending',
    paymentMethod: 'bank_transfer',
    paymentStatus: 'pending',
    promotionCode: null,
    total: 1_000_000,
    items: [
      {
        productID: 'p1',
        variantID: 'v1',
        name: 'Đèn sò',
        variantName: null,
        sku: 'DEN-1',
        imageUrl: null,
        unitPrice: 500_000,
        quantity: 2,
        lineTotal: 1_000_000,
        assemblyFee: 0,
        stockReserved: true,
      },
      {
        productID: 'p2',
        variantID: 'v2',
        name: 'Đèn đặt làm',
        variantName: null,
        sku: 'DEN-2',
        imageUrl: null,
        unitPrice: 300_000,
        quantity: 1,
        lineTotal: 300_000,
        assemblyFee: 0,
        stockReserved: false,
      },
    ],
    ...patch,
  }) as Order;

describe('order actions', () => {
  it('bước tiếp theo theo bảng chuyển trạng thái', () => {
    expect(getNextStatuses({ status: 'pending' })).toMatchObject({
      primary: 'confirmed',
      canCancel: true,
    });
    expect(getNextStatuses({ status: 'processing' })).toMatchObject({
      primary: 'shipping',
      canCancel: false,
    });
    expect(getNextStatuses({ status: 'cancelled' }).all).toEqual([]);
  });

  it('chỉ xác nhận nhận tiền cho đơn chuyển khoản chưa trả, chưa đóng', () => {
    expect(canMarkPaid(order())).toBe(true);
    expect(canMarkPaid(order({ paymentStatus: 'paid' }))).toBe(false);
    expect(canMarkPaid(order({ paymentMethod: 'cod' }))).toBe(false);
    expect(canMarkPaid(order({ status: 'cancelled' }))).toBe(false);
  });

  it('hủy: hoàn kho phần đã trừ, trả lượt mã, nhắc hoàn tiền', () => {
    const effects = transitionEffects(
      order({ promotionCode: 'TET10', paymentStatus: 'paid' }),
      'cancelled',
    );
    expect(effects[0]).toBe('Hoàn lại kho 2 sản phẩm.');
    expect(effects).toContain('Trả lại 1 lượt dùng mã TET10.');
    expect(effects.some((text) => text.includes('Đã hoàn tiền'))).toBe(true);
  });

  it('giao xong đơn COD chưa trả thì báo sẽ đánh dấu đã thanh toán', () => {
    expect(
      transitionEffects(order({ paymentMethod: 'cod' }), 'delivered'),
    ).toContain('Đơn COD được đánh dấu đã thanh toán.');
  });

  it('ghép địa chỉ, bỏ cấp huyện trống', () => {
    expect(
      formatAddress({
        fullName: 'An',
        phone: '0912345678',
        street: '12 Lê Lợi',
        ward: 'Phường Bến Nghé',
        district: null,
        province: 'Hồ Chí Minh',
      }),
    ).toBe('12 Lê Lợi, Phường Bến Nghé, Hồ Chí Minh');
  });
});

const raw = (patch: Partial<typeof ORDER_FILTER_DEFAULTS>) => ({
  ...ORDER_FILTER_DEFAULTS,
  ...patch,
});

describe('toOrderQuery', () => {
  it('mặc định không lọc, trang 1, 20 dòng', () => {
    expect(toOrderQuery(raw({}))).toEqual({ page: 1, itemPerPage: 20 });
    expect(hasOrderFilters(toOrderFilter(raw({})))).toBe(false);
  });

  it('tìm theo mã đơn hoặc email tùy ô "tìm theo"', () => {
    expect(toOrderFilter(raw({ q: ' HD2611 ' }))).toEqual({
      orderNumber: 'HD2611',
    });
    expect(toOrderFilter(raw({ q: 'an@', by: 'email' }))).toEqual({
      email: 'an@',
    });
  });

  it('bỏ giá trị sai và ngày "đến" trước ngày "từ"', () => {
    expect(
      toOrderFilter(
        raw({
          status: 'shipping',
          method: 'momo',
          payment: 'paid',
          from: '2026-11-10',
          to: '2026-11-01',
        }),
      ),
    ).toEqual({
      status: 'shipping',
      paymentStatus: 'paid',
      from: '2026-11-10',
    });
    expect(toOrderFilter(raw({ from: '10/11/2026' })).from).toBeUndefined();
  });
});
