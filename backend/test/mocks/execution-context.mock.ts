import { ExecutionContext } from '@nestjs/common';

export const createExecutionContext = (
  req: Record<string, any> = {},
  res: Record<string, any> = {},
): ExecutionContext => {
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
