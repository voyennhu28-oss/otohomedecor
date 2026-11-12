import { ExecutionContext } from '@nestjs/common';

/**
 * Tạo ExecutionContext giả cho test Guard/Interceptor.
 * Guard thường chỉ dùng: switchToHttp().getRequest(), getHandler(), getClass()
 * → chỉ cần mock đúng mấy hàm đó.
 */
export const createExecutionContext = (
  req: Record<string, any> = {},
  res: Record<string, any> = {},
): ExecutionContext => {
  // Tạo 1 lần để getHandler()/getClass() luôn trả CÙNG tham chiếu
  // (giống Nest thật) → toHaveBeenCalledWith so sánh được.
  const handler = function handler() {};
  class TestController {}
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => handler,
    getClass: () => TestController,
  } as unknown as ExecutionContext;
};
