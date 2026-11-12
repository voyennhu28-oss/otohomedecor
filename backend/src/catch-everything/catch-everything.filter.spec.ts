import {
  ArgumentsHost,
  ConflictException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import { ApiUtilService } from '../common/utils/api-util/api-util.service';
import { CatchEverythingFilter } from './catch-everything.filter';
import { ZodExceptionFilter } from './zod-exception/zod-exception.filter';

const prismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError(`Invalid query ... ${code}`, {
    code,
    clientVersion: '6.19.0',
    meta,
  });

describe('CatchEverythingFilter', () => {
  let filter: CatchEverythingFilter;
  let reply: jest.Mock;
  let loggerError: jest.SpyInstance;
  const host = {
    switchToHttp: () => ({
      getResponse: () => 'res',
      getRequest: () => ({ method: 'POST', url: '/api/admin/products' }),
    }),
  } as unknown as ArgumentsHost;

  beforeEach(() => {
    reply = jest.fn();
    const adapterHost = { httpAdapter: { reply } } as unknown as HttpAdapterHost;
    filter = new CatchEverythingFilter(
      adapterHost,
      new ZodExceptionFilter(),
      new ApiUtilService(),
    );
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  /** Gọi filter, trả về [status, body] đã gửi cho client. */
  const handle = (exception: unknown) => {
    filter.catch(exception, host);
    const [, body, status] = reply.mock.calls[0];
    return { status, body };
  };

  it('HttpException: giữ status và message', () => {
    const { status, body } = handle(new NotFoundException('Không tìm thấy sản phẩm'));
    expect(status).toBe(HttpStatus.NOT_FOUND);
    expect(body).toEqual({
      errors: [{ message: 'Không tìm thấy sản phẩm' }],
      data: null,
      message: 'ERROR',
    });
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('ThrottlerException: 429', () => {
    expect(handle(new ThrottlerException()).status).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  describe('lỗi Prisma', () => {
    it('P2002 (MongoDB, target là tên index) → 409 kèm field bị trùng', () => {
      const { status, body } = handle(prismaError('P2002', { target: 'Product_slug_key' }));
      expect(status).toBe(HttpStatus.CONFLICT);
      expect(body.errors).toEqual([{ message: 'Dữ liệu đã tồn tại: slug', fields: ['slug'] }]);
    });

    it('P2002 với index nhiều field → liệt kê đủ field', () => {
      const { body } = handle(
        prismaError('P2002', { target: 'Review_userID_productID_orderID_key' }),
      );
      expect(body.errors[0].fields).toEqual(['userID', 'productID', 'orderID']);
    });

    it('P2002 (target là mảng field) → 409', () => {
      const { status, body } = handle(prismaError('P2002', { target: ['sku'] }));
      expect(status).toBe(HttpStatus.CONFLICT);
      expect(body.errors[0].fields).toEqual(['sku']);
    });

    it.each([
      ['P2025', HttpStatus.NOT_FOUND],
      ['P2023', HttpStatus.BAD_REQUEST],
      ['P2034', HttpStatus.CONFLICT],
    ])('%s → %i', (code, expected) => {
      expect(handle(prismaError(code)).status).toBe(expected);
    });

    it('không lộ message gốc của Prisma (có query, tên index) cho client', () => {
      const { body } = handle(prismaError('P2025'));
      expect(JSON.stringify(body)).not.toContain('Invalid query');
    });

    it('mã lạ → 500, ghi log', () => {
      const { status } = handle(prismaError('P9999'));
      expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(loggerError).toHaveBeenCalled();
    });
  });

  describe('lỗi Zod', () => {
    const zodError = z
      .object({ email: z.string().email(), password: z.string().min(8) })
      .safeParse({ email: 'x', password: '1' }).error;

    it('ZodValidationException → 400 kèm field lỗi', () => {
      const { status, body } = handle(new ZodValidationException(zodError));
      expect(status).toBe(HttpStatus.BAD_REQUEST);
      expect(body.errors.flatMap((e: { fields: string[] }) => e.fields)).toEqual(
        expect.arrayContaining(['email', 'password']),
      );
    });

    it('ZodSerializationException (response sai schema) là lỗi server → 500', () => {
      const { status } = handle(new ZodSerializationException(zodError));
      expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(loggerError).toHaveBeenCalled();
    });
  });

  describe('lỗi không xác định', () => {
    it('→ 500, câu chung cho client, log đầy đủ stack cho server', () => {
      const { status, body } = handle(new TypeError("Cannot read properties of undefined (reading 'id')"));
      expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body.errors).toEqual([{ message: 'Lỗi hệ thống, vui lòng thử lại sau' }]);
      expect(loggerError).toHaveBeenCalledWith(
        'POST /api/admin/products',
        expect.stringContaining('TypeError'),
      );
    });

    it('lỗi 4xx không ghi log error', () => {
      handle(new ConflictException('Email đã được sử dụng'));
      expect(loggerError).not.toHaveBeenCalled();
    });
  });
});
