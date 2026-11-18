import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/lib/api-client';

type Options<T extends FieldValues> = {
  fields: readonly Path<T>[];
  conflictField?: Path<T>;
};

export function setServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
  { fields, conflictField }: Options<T>,
) {
  if (!(error instanceof ApiError)) {
    setError('root.server', { message: 'Có lỗi xảy ra, vui lòng thử lại' });
    return;
  }

  if (error.status === 409 && conflictField) {
    setError(conflictField, { message: error.message }, { shouldFocus: true });
    return;
  }

  let rootMessage: string | undefined;
  for (const item of error.errors) {
    const field = item.fields?.find((name): name is Path<T> =>
      (fields as readonly string[]).includes(name),
    );
    if (field) setError(field, { message: item.message });
    else rootMessage ??= item.message;
  }
  if (rootMessage) setError('root.server', { message: rootMessage });
}
