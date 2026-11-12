import { Global, Injectable } from '@nestjs/common';
import { BuildSearchParams, Operator } from './interfaces/query-util.interface';

@Global()
@Injectable()
export class QueryUtilService {
  convertFieldsSelectOption<T>(value?: string | null) {
    const data = value
      ?.split(',')
      ?.reduce(
        (acc, field) => ({ ...acc, [field.trim()]: true }),
        {} as Partial<Record<keyof T, boolean>>,
      );
    return data;
  }

  private buildSearchOr(search) {
    const data = Object.keys(search).reduce<{
      OR: Record<string, any>;
    }>(
      (acc, key) => {
        acc.OR.push({
          [key]: {
            contains: search[key],
            mode: 'insensitive',
          },
        });
        return acc;
      },
      { OR: [] },
    );
    return data;
  }

  buildSearchQuery<T>({
    search,
    operator = Operator.OR,
  }: BuildSearchParams<T>) {
    let data;
    switch (operator) {
      case Operator.OR:
        data = this.buildSearchOr(search);
        break;
      default:
        data = this.buildSearchOr(search);
        break;
    }

    return data;
  }
}
