import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';

describe('Category DTO imageUrl (BUG-06)', () => {
  it('chỉ nhận http(s)', () => {
    expect(CreateCategoryDto.schema.safeParse({ name: 'Sofa', imageUrl: 'https://cdn/a.jpg' }).success).toBe(true);
    expect(CreateCategoryDto.schema.safeParse({ name: 'Sofa', imageUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(UpdateCategoryDto.schema.safeParse({ imageUrl: 'data:image/svg+xml,<svg onload=alert(1)>' }).success).toBe(false);
    expect(UpdateCategoryDto.schema.safeParse({ imageUrl: null }).success).toBe(true);
  });
});
