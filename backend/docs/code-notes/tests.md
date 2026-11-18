# Test e2e và mock (test/)

## `test/csrf.e2e-spec.ts`

- **(đầu file)**: BUG-01: chống CSRF qua cookie. Dựng app giống main.ts (NEST_APP_OPTIONS + initApp) với
  controller admin giả và AuthController thật (AuthService mock), không cần database.
- **describe('CSRF (e2e)')**: Prisma Client tự nạp .env khi import: bỏ giá trị local để test đúng giá trị MẶC ĐỊNH

## `test/factories/sale-variant.factory.ts`

- **makeSaleVariant**: Variant đang bán, đủ hàng. Ghi đè field cần thiết cho từng test.

## `test/mocks/execution-context.mock.ts`

- **createExecutionContext**: Tạo ExecutionContext giả cho test Guard/Interceptor.
  Guard thường chỉ dùng: switchToHttp().getRequest(), getHandler(), getClass()
  → chỉ cần mock đúng mấy hàm đó.
- **createExecutionContext**: Tạo 1 lần để getHandler()/getClass() luôn trả CÙNG tham chiếu
- **createExecutionContext › handler**: (giống Nest thật) → toHaveBeenCalledWith so sánh được.

## `test/mocks/prisma.mock.ts`

- **createPrismaModelMock**: Mock 1 model của Prisma (vd: prisma.extended.user).
  Mỗi method là jest.fn() → trong test chỉ cần:
    model.findUnique.mockResolvedValue(...)
  và sau đó kiểm tra: expect(model.findUnique).toHaveBeenCalledWith(...)
- **createPrismaModelMock › softDelete**: các method custom thêm bằng Client Extensions trong PrismaService
- **createPrismaServiceMock**: Mock PrismaService cho 1 model.
  PrismaBaseService đọc `prismaService[model]` (client) và
  `prismaService.extended[model]` (extended) → mock cả hai,
  dùng chung 1 object để test không phải quan tâm service gọi cái nào.
