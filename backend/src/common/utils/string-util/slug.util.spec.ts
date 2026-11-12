import { pickAvailableSlug } from './slug.util';

describe('pickAvailableSlug', () => {
  it('chưa ai dùng: giữ nguyên', () => {
    expect(pickAvailableSlug('ban-tra', [])).toBe('ban-tra');
  });

  it('đã có: thêm hậu tố nhỏ nhất còn trống', () => {
    expect(pickAvailableSlug('ban-tra', ['ban-tra', 'ban-tra-2', 'ban-tra-go'])).toBe('ban-tra-3');
  });

  it('slug dành riêng cho route tĩnh coi như đã dùng', () => {
    expect(pickAvailableSlug('featured', [], ['featured', 'filters'])).toBe('featured-2');
  });
});
