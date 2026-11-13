import { CreateAddressDto, UpdateAddressDto } from './address.dto';

const valid = {
  fullName: 'Nguyễn An',
  phone: '0901234567',
  province: 'Hồ Chí Minh',
  ward: 'Phường Sài Gòn',
  street: '1 Lê Lợi',
};

describe('Address DTO', () => {
  it('không cần quận / huyện (đã bỏ cấp huyện từ 01/07/2025), mặc định không phải địa chỉ mặc định', () => {
    expect(CreateAddressDto.schema.parse(valid)).toEqual({ ...valid, isDefault: false });
    expect(CreateAddressDto.schema.parse({ ...valid, district: 'Quận 1' }).district).toBe('Quận 1');
  });

  it.each([
    ['tỉnh không thuộc 34 tỉnh mới (đã sáp nhập)', { province: 'Bình Dương' }],
    ['số điện thoại sai', { phone: '12345' }],
    ['thiếu phường / xã', { ward: '' }],
    ['gửi userID', { userID: 'aaaaaaaaaaaaaaaaaaaaaaaa' }],
  ])('%s → lỗi', (_name, override) => {
    expect(CreateAddressDto.schema.safeParse({ ...valid, ...override }).success).toBe(false);
  });

  it('PATCH không nhận isDefault (dùng PATCH /:id/default)', () => {
    expect(UpdateAddressDto.schema.safeParse({ street: '2 Lê Lợi' }).success).toBe(true);
    expect(UpdateAddressDto.schema.safeParse({ isDefault: true }).success).toBe(false);
  });
});
