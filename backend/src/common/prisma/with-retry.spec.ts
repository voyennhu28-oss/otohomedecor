import { Prisma } from '@prisma/client';
import { isTransactionConflict, withRetry } from './with-retry';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('x', { code, clientVersion: 'test' });

describe('withRetry', () => {
  it('thành công ngay thì chỉ chạy 1 lần', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gặp P2034 thì chạy lại', async () => {
    const fn = jest.fn().mockRejectedValueOnce(prismaError('P2034')).mockResolvedValue('ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('hết lượt thì ném lỗi P2034', async () => {
    const fn = jest.fn().mockRejectedValue(prismaError('P2034'));
    await expect(withRetry(fn, 2)).rejects.toMatchObject({ code: 'P2034' });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('lỗi khác thì ném ngay, không chạy lại', async () => {
    const fn = jest.fn().mockRejectedValue(prismaError('P2002'));
    await expect(withRetry(fn)).rejects.toMatchObject({ code: 'P2002' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('isTransactionConflict chỉ đúng với P2034', () => {
    expect(isTransactionConflict(prismaError('P2034'))).toBe(true);
    expect(isTransactionConflict(prismaError('P2025'))).toBe(false);
    expect(isTransactionConflict(new Error('P2034'))).toBe(false);
  });
});
