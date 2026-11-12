import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseParamsOptionPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (value.limit) {
      value.limit = parseInt(value.limit);
    }
    return value;
  }
}
