import { CheckoutDto, CheckoutPreviewDto } from '../../checkout/dto/checkout.dto';
import { AdminOrderListQueryDto, ExportOrdersDto, OrderNumberParamDto } from './order.dto';

describe('Order DTO', () => {
  it('from / to dạng ngày: hiểu là cả ngày theo giờ Việt Nam', () => {
    const q = AdminOrderListQueryDto.schema.parse({ from: '2026-11-13', to: '2026-11-13' });
    expect(q.from?.toISOString()).toBe('2026-11-12T17:00:00.000Z');
    expect(q.to?.toISOString()).toBe('2026-11-13T16:59:59.999Z');
    expect(q).toMatchObject({ page: 1, itemPerPage: 20 });
  });

  it('from sau to → lỗi; ngày sai → lỗi', () => {
    expect(AdminOrderListQueryDto.schema.safeParse({ from: '2026-11-14', to: '2026-11-13' }).success).toBe(false);
    expect(AdminOrderListQueryDto.schema.safeParse({ from: 'hôm qua' }).success).toBe(false);
  });

  it('export: không gửi body = xuất tất cả; không nhận field lạ', () => {
    expect(ExportOrdersDto.schema.parse(undefined)).toEqual({});
    expect(ExportOrdersDto.schema.safeParse({ page: 1 }).success).toBe(false);
  });

  it('mã đơn: viết hoa, đúng định dạng', () => {
    expect(OrderNumberParamDto.schema.parse({ orderNumber: 'hd261113-abcdef' })).toEqual({ orderNumber: 'HD261113-ABCDEF' });
    expect(OrderNumberParamDto.schema.safeParse({ orderNumber: 'HD261113-ABC0EF' }).success).toBe(false); // không có số 0
  });
});

describe('Checkout DTO', () => {
  const base = { addressID: 'aaaaaaaaaaaaaaaaaaaaaaaa' };

  it('preview: mã rỗng coi như không có, mã viết hoa, mặc định không lắp đặt', () => {
    expect(CheckoutPreviewDto.schema.parse({ ...base, promotionCode: '' })).toEqual({ ...base, withAssembly: false });
    expect(CheckoutPreviewDto.schema.parse({ ...base, promotionCode: 'welcome10' }).promotionCode).toBe('WELCOME10');
  });

  it('checkout: nhận COD và chuyển khoản (SePay); VNPay / MoMo đã bỏ', () => {
    expect(CheckoutDto.schema.safeParse({ ...base, paymentMethod: 'cod' }).success).toBe(true);
    expect(CheckoutDto.schema.safeParse({ ...base, paymentMethod: 'bank_transfer' }).success).toBe(true);
    const vnpay = CheckoutDto.schema.safeParse({ ...base, paymentMethod: 'vnpay' });
    expect(vnpay.success).toBe(false);
    expect(vnpay.error?.issues[0].message).toMatch(/chỉ hỗ trợ: cod, bank_transfer/);
  });

  it('không nhận giá / tổng tiền từ client', () => {
    expect(CheckoutDto.schema.safeParse({ ...base, paymentMethod: 'cod', total: 1 }).success).toBe(false);
  });
});
