import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ApiUtilService } from '../../utils/api-util/api-util.service';
import { FormatResponseInterceptor } from './format-response.interceptor';

describe('FormatResponseInterceptor', () => {
  const interceptor = new FormatResponseInterceptor(new ApiUtilService());
  const handle = (data: unknown): CallHandler => ({ handle: () => of(data) });

  it('bọc dữ liệu trả về theo format chung { errors, data, message }', async () => {
    const result$ = interceptor.intercept({} as ExecutionContext, handle({ id: 1 }));
    await expect(lastValueFrom(result$)).resolves.toEqual({
      errors: null,
      data: { id: 1 },
      message: 'OK',
    });
  });

  it('dữ liệu có message thì dùng làm message của response', async () => {
    const result$ = interceptor.intercept({} as ExecutionContext, handle({ message: 'Đã đăng xuất' }));
    await expect(lastValueFrom(result$)).resolves.toMatchObject({ message: 'Đã đăng xuất' });
  });
});
