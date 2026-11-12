import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response } from 'express';
import { DateUtilService } from '../../utils/date-util/date-util.service';

@Injectable()
export class ExcelResponseInterceptor implements NestInterceptor {
  constructor(private dateUtilService: DateUtilService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse<Response>();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const fileName = context
      .getClass()
      .name.replace('Controller', '')
      .toLowerCase();

    const currentDate = this.dateUtilService
      .getCurrentDate('en-CA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false,
      })
      .replaceAll('-', '_');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}_${currentDate}.xlsx"`,
    );

    return next.handle();
  }
}
