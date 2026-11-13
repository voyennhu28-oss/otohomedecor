import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import {
  findOrderNumberInText,
  generateOrderNumber,
  ORDER_NUMBER_REGEX,
  toPaymentCode,
} from './order-number';
import { assertTransition, canTransition, ORDER_TRANSITIONS, statusTimestamp } from './order-status';

const ALL = Object.values(OrderStatus);

describe('order-status', () => {
  const VALID: [OrderStatus, OrderStatus][] = [
    ['pending', 'confirmed'],
    ['pending', 'cancelled'],
    ['confirmed', 'processing'],
    ['confirmed', 'cancelled'],
    ['processing', 'shipping'],
    ['shipping', 'delivered'],
    ['delivered', 'returned'],
  ];

  it.each(VALID)('%s → %s hợp lệ', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it('mọi cặp còn lại đều bị từ chối (400)', () => {
    const valid = new Set(VALID.map(([a, b]) => `${a}>${b}`));
    for (const from of ALL) {
      for (const to of ALL) {
        if (valid.has(`${from}>${to}`)) continue;
        expect(canTransition(from, to)).toBe(false);
        expect(() => assertTransition(from, to)).toThrow(BadRequestException);
      }
    }
  });

  it('không hủy được đơn đang chuẩn bị / đang giao / đã giao', () => {
    for (const from of [OrderStatus.processing, OrderStatus.shipping, OrderStatus.delivered]) {
      expect(canTransition(from, OrderStatus.cancelled)).toBe(false);
    }
  });

  it('cancelled và returned là trạng thái cuối', () => {
    expect(ORDER_TRANSITIONS.cancelled).toEqual([]);
    expect(ORDER_TRANSITIONS.returned).toEqual([]);
  });

  it('thông báo lỗi dùng nhãn tiếng Việt', () => {
    expect(() => assertTransition('delivered', 'cancelled')).toThrow('từ "Đã giao" sang "Đã hủy"');
  });

  it('statusTimestamp: shipping / delivered / cancelled có mốc thời gian riêng', () => {
    const at = new Date();
    expect(statusTimestamp(OrderStatus.shipping, at)).toEqual({ shippedAt: at });
    expect(statusTimestamp(OrderStatus.delivered, at)).toEqual({ deliveredAt: at });
    expect(statusTimestamp(OrderStatus.cancelled, at)).toEqual({ cancelledAt: at });
    expect(statusTimestamp(OrderStatus.confirmed, at)).toEqual({});
  });
});

describe('generateOrderNumber', () => {
  it('HD + ngày theo giờ Việt Nam + 6 ký tự dễ đọc', () => {
    // 2026-11-13 18:30 UTC = 2026-11-14 01:30 giờ VN
    const number = generateOrderNumber(new Date('2026-11-13T18:30:00Z'));
    expect(number).toMatch(/^HD261114-/);
    expect(number).toMatch(ORDER_NUMBER_REGEX);
    expect(number.slice(-6)).not.toMatch(/[01OI]/);
  });

  it('ngẫu nhiên giữa các lần gọi', () => {
    const numbers = new Set(Array.from({ length: 200 }, () => generateOrderNumber()));
    expect(numbers.size).toBe(200);
  });
});

describe('mã thanh toán SePay', () => {
  it('toPaymentCode: bỏ dấu "-" → khớp cấu hình SePay (tiền tố HD + 12 ký tự số và chữ)', () => {
    const code = toPaymentCode('HD261113-7K3M9Q');
    expect(code).toBe('HD2611137K3M9Q');
    expect(code).toMatch(/^HD[0-9A-Z]{12}$/);
  });

  it('findOrderNumberInText: đọc lại mã đơn từ code / nội dung chuyển khoản', () => {
    expect(findOrderNumberInText('HD2611137K3M9Q')).toBe('HD261113-7K3M9Q');
    // ngân hàng thêm tiền tố, khách gõ thường / có khoảng trắng / còn giữ dấu "-"
    expect(findOrderNumberInText('MBVCB.123456.hd2611137k3m9q thanh toan')).toBe('HD261113-7K3M9Q');
    expect(findOrderNumberInText('CK HD261113-7K3M9Q')).toBe('HD261113-7K3M9Q');
    expect(findOrderNumberInText('HD 261113 7K3M9Q')).toBe('HD261113-7K3M9Q');
  });

  it('findOrderNumberInText: không có mã hợp lệ → null', () => {
    expect(findOrderNumberInText(null)).toBeNull();
    expect(findOrderNumberInText('chuyen tien an trua')).toBeNull();
    expect(findOrderNumberInText('HD2611137K3M90')).toBeNull(); // số 0 không có trong bảng ký tự
  });

  it('khứ hồi: mọi mã đơn sinh ra đều đọc lại đúng từ mã thanh toán', () => {
    for (let i = 0; i < 100; i++) {
      const orderNumber = generateOrderNumber();
      expect(findOrderNumberInText(toPaymentCode(orderNumber))).toBe(orderNumber);
    }
  });
});
