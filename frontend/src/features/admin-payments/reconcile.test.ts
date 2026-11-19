import { describe, expect, it } from 'vitest';

import {
  mismatchReason,
  PAYMENT_FILTER_DEFAULTS,
  suggestedAction,
  toPaymentQuery,
} from '@/features/admin-payments/reconcile';
import type { AdminPaymentListItem } from '@/features/orders/types';

const payment = (
  patch: Partial<AdminPaymentListItem> = {},
  order: Partial<NonNullable<AdminPaymentListItem['order']>> = {},
): AdminPaymentListItem => ({
  id: 'pay1',
  orderID: 'o1',
  method: 'bank_transfer',
  amount: 1_000_000,
  status: 'failed',
  transactionID: '92704',
  rawResponse: null,
  createdAt: '2026-11-19T08:00:00.000Z',
  updatedAt: '2026-11-19T08:00:00.000Z',
  order: {
    id: 'o1',
    orderNumber: 'HD261119-7K3M9Q',
    status: 'pending',
    paymentStatus: 'pending',
    total: 1_000_000,
    ...order,
  },
  ...patch,
});

describe('mismatchReason', () => {
  it('giao dịch đã khớp thì không có lý do', () => {
    expect(mismatchReason(payment({ status: 'paid' }))).toBeNull();
  });

  it('sai số tiền ưu tiên trước', () => {
    expect(mismatchReason(payment({ amount: 900_000 }))).toMatch(
      /^Sai số tiền: thiếu/,
    );
    expect(suggestedAction(payment({ amount: 900_000 }))).toMatch(/xác nhận/);
  });

  it('đơn đã hủy / đã trả tiền', () => {
    expect(mismatchReason(payment({}, { status: 'cancelled' }))).toBe(
      'Tiền về khi đơn đã hủy / trả hàng',
    );
    expect(mismatchReason(payment({}, { paymentStatus: 'paid' }))).toBe(
      'Đơn đã thanh toán trước đó (chuyển trùng)',
    );
    expect(suggestedAction(payment({}, { paymentStatus: 'paid' }))).toBe(
      'Hoàn lại tiền cho khách',
    );
  });
});

describe('toPaymentQuery', () => {
  it('đọc trạng thái, mã đơn, trang', () => {
    expect(
      toPaymentQuery({
        ...PAYMENT_FILTER_DEFAULTS,
        status: 'failed',
        q: ' HD2611 ',
        size: '500',
      }),
    ).toEqual({
      status: 'failed',
      orderNumber: 'HD2611',
      page: 1,
      itemPerPage: 100,
    });
  });
});
