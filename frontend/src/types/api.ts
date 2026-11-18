export type ApiErrorItem = {
  message: string;
  fields?: string[];
};

export type Page<T> = {
  list: T[];
  totalItems: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  errors: ApiErrorItem[] | null;
  data: T | null;
  message: string;
};
