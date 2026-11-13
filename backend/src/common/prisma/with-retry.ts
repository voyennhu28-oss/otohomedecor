import { Prisma } from '@prisma/client';

/** Transaction bị xung đột ghi / deadlock (MongoDB: WriteConflict). Chạy lại là an toàn. */
export const isTransactionConflict = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Chạy lại `fn` khi transaction bị xung đột ghi (P2034), có chờ ngắn + ngẫu nhiên
 * để các request đang tranh nhau không đụng lại đúng lúc. Lỗi khác ném ra ngay.
 * Hết lượt thì ném lỗi P2034, CatchEverythingFilter trả 409.
 *
 * Lưu ý: transaction MongoDB (snapshot isolation) KHÔNG chặn write skew. Muốn 2 transaction
 * "đọc rồi kiểm tra" loại trừ nhau thì cả hai phải GHI vào cùng 1 document.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts || !isTransactionConflict(error)) throw error;
      await sleep(attempt * 20 + Math.random() * 30);
    }
  }
}
