import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { SKIP_FORMAT_RESPONSE } from '../../decorators/skip-format-response.decorator';
import { ApiUtilService } from '../../utils/api-util/api-util.service';

@Injectable()
export class FormatResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly apiUtilService: ApiUtilService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skip = this.reflector.getAllAndOverride<boolean | undefined>(
      SKIP_FORMAT_RESPONSE,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return next.handle();

    return next
      .handle()
      .pipe(
        map((data) =>
          data instanceof StreamableFile
            ? data
            : this.apiUtilService.formatResponse({ data }),
        ),
      );
  }
}
