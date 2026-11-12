import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import { ApiUtilService } from '../common/utils/api-util/api-util.service';
import { ZodExceptionFilter } from './zod-exception/zod-exception.filter';

type ErrorItem = { message: string; [key: string]: unknown };

/** Lỗi Prisma hay gặp → HTTP status + câu thông báo cho client (không lộ query / tên index). */
const PRISMA_ERRORS: Record<string, { status: HttpStatus; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'Dữ liệu đã tồn tại' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Không tìm thấy dữ liệu' },
  P2023: { status: HttpStatus.BAD_REQUEST, message: 'ID không hợp lệ' },
  P2034: {
    status: HttpStatus.CONFLICT,
    message: 'Dữ liệu đang được cập nhật, vui lòng thử lại',
  },
};

/**
 * Field bị trùng của lỗi P2002. MongoDB trả tên index (vd "Product_slug_key"),
 * SQL trả mảng field (vd ["slug"]).
 */
const duplicatedFields = (target: unknown): string[] => {
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === 'string') {
    const match = /^[A-Za-z]+_(.+)_key$/.exec(target);
    return match ? match[1].split('_') : [target];
  }
  return [];
};

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  private readonly logger = new Logger(CatchEverythingFilter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly zodFilter: ZodExceptionFilter,
    private readonly apiUtilService: ApiUtilService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const { status, errors } = this.resolve(exception);

    // Lỗi 5xx là lỗi của server: ghi log đầy đủ để debug, client chỉ thấy câu chung
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const req = ctx.getRequest<Request>();
      this.logger.error(
        `${req?.method} ${req?.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const responseBody = this.apiUtilService.formatResponse({ errors });
    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }

  private resolve(exception: unknown): { status: number; errors: ErrorItem[] } {
    // Dữ liệu client gửi lên sai schema
    if (exception instanceof ZodValidationException) {
      const zodErrors = this.zodFilter.catch(exception);
      return {
        status: HttpStatus.BAD_REQUEST,
        errors: Array.isArray(zodErrors)
          ? zodErrors
          : [{ message: exception.message }],
      };
    }

    // Response của server không khớp schema: lỗi của server
    if (exception instanceof ZodSerializationException) {
      return this.internalError();
    }

    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        errors: [{ message: exception.message }],
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const known = PRISMA_ERRORS[exception.code];
      if (!known) return this.internalError();
      const fields =
        exception.code === 'P2002'
          ? duplicatedFields(exception.meta?.target)
          : undefined;
      return {
        status: known.status,
        errors: [
          fields?.length
            ? { message: `${known.message}: ${fields.join(', ')}`, fields }
            : { message: known.message },
        ],
      };
    }

    return this.internalError();
  }

  private internalError() {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errors: [{ message: 'Lỗi hệ thống, vui lòng thử lại sau' }],
    };
  }
}
