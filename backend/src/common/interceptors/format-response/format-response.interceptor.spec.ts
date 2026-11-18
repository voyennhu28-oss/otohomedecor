import {
  StreamableFile,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { SkipFormatResponse } from '../../decorators/skip-format-response.decorator';
import { ApiUtilService } from '../../utils/api-util/api-util.service';
import { FormatResponseInterceptor } from './format-response.interceptor';

class TestController {
  normal() {}

  @SkipFormatResponse()
  raw() {}
}

describe('FormatResponseInterceptor', () => {
  const interceptor = new FormatResponseInterceptor(
    new ApiUtilService(),
    new Reflector(),
  );
  const handle = (data: unknown): CallHandler => ({ handle: () => of(data) });
  const contextFor = (method: 'normal' | 'raw') =>
    ({
      getHandler: () => TestController.prototype[method],
      getClass: () => TestController,
    }) as unknown as ExecutionContext;

  it('bọc dữ liệu trả về theo format chung { errors, data, message }', async () => {
    const result$ = interceptor.intercept(
      contextFor('normal'),
      handle({ id: 1 }),
    );
    await expect(lastValueFrom(result$)).resolves.toEqual({
      errors: null,
      data: { id: 1 },
      message: 'OK',
    });
  });

  it('controller không trả gì thì data = null', async () => {
    const result$ = interceptor.intercept(
      contextFor('normal'),
      handle(undefined),
    );
    await expect(lastValueFrom(result$)).resolves.toEqual({
      errors: null,
      data: null,
      message: 'OK',
    });
  });

  it('dữ liệu có message thì dùng làm message của response', async () => {
    const result$ = interceptor.intercept(
      contextFor('normal'),
      handle({ message: 'Đã đăng xuất' }),
    );
    await expect(lastValueFrom(result$)).resolves.toMatchObject({
      message: 'Đã đăng xuất',
    });
  });

  it('không bọc file (StreamableFile)', async () => {
    const file = new StreamableFile(Buffer.from('xlsx'));
    const result$ = interceptor.intercept(contextFor('normal'), handle(file));
    await expect(lastValueFrom(result$)).resolves.toBe(file);
  });

  it('không bọc route gắn @SkipFormatResponse()', async () => {
    const result$ = interceptor.intercept(
      contextFor('raw'),
      handle({ success: true }),
    );
    await expect(lastValueFrom(result$)).resolves.toEqual({ success: true });
  });
});
