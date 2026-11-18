import type { ApiErrorItem, ApiResponse } from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly errors: ApiErrorItem[],
  ) {
    super(errors[0]?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    this.name = 'ApiError';
  }
}

type RequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  body?: unknown;
  skipAuthRefresh?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;
let authFailureHandler: (() => void) | null = null;

export function setAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

function refreshSession(): Promise<boolean> {
  refreshPromise ??= fetch(`${BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

function send(method: string, path: string, options: RequestOptions) {
  const { body, headers, ...init } = options;
  const isFormData = body instanceof FormData;

  return fetch(`${BASE_URL}${path}`, {
    ...init,
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && !isFormData
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...headers,
    },
    body:
      body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });
}

const NETWORK_ERROR = new ApiError(0, [
  { message: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.' },
]);

async function sendWithRefresh(
  method: string,
  path: string,
  options: RequestOptions,
): Promise<Response> {
  let res: Response;
  try {
    res = await send(method, path, options);
    if (res.status === 401 && !options.skipAuthRefresh) {
      if (await refreshSession()) {
        res = await send(method, path, options);
      } else {
        authFailureHandler?.();
      }
    }
  } catch {
    throw NETWORK_ERROR;
  }

  if (res.status === 429) {
    throw new ApiError(429, [
      { message: 'Bạn thử quá nhiều lần. Đợi 1 phút rồi thử lại.' },
    ]);
  }
  return res;
}

async function toApiError(res: Response) {
  const payload = (await res
    .json()
    .catch(() => null)) as ApiResponse<unknown> | null;
  return new ApiError(
    res.status,
    payload?.errors?.length
      ? payload.errors
      : [{ message: 'Có lỗi xảy ra, vui lòng thử lại' }],
  );
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const res = await sendWithRefresh(method, path, options);
  const payload = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !payload || payload.errors?.length) {
    throw new ApiError(
      res.status,
      payload?.errors?.length
        ? payload.errors
        : [{ message: 'Có lỗi xảy ra, vui lòng thử lại' }],
    );
  }
  if (!('data' in payload) || payload.data === undefined) {
    throw new ApiError(res.status, [
      { message: 'Phản hồi từ máy chủ không đúng định dạng' },
    ]);
  }
  return payload.data as T;
}

export type DownloadedFile = { blob: Blob; filename: string | null };

async function download(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<DownloadedFile> {
  const res = await sendWithRefresh(method, path, {
    ...options,
    headers: { Accept: '*/*', ...options.headers },
  });
  if (!res.ok) throw await toApiError(res);
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return {
    blob: await res.blob(),
    filename: match ? decodeURIComponent(match[1]) : null,
  };
}

export function saveFile({ blob }: DownloadedFile, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const api = {
  download: (path: string, body?: unknown, options?: RequestOptions) =>
    download('POST', path, { ...options, body }),
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, options),
};
