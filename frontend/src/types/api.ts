/** Một lỗi trong `errors`. Lỗi validate của backend có kèm `fields` (tên field bị sai). */
export type ApiErrorItem = {
  message: string;
  fields?: string[];
};

/** Mọi response của backend đều bọc thành `{ errors, data, message }`. */
export type ApiResponse<T> = {
  errors: ApiErrorItem[] | null;
  data: T | null;
  message: string;
};
