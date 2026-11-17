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
  /** Không tự refresh token khi gặp 401 (dùng cho chính các route auth). */
  skipAuthRefresh?: boolean;
};

// ---- Refresh token ----------------------------------------------------------

let refreshPromise: Promise<boolean> | null = null;
let authFailureHandler: (() => void) | null = null;

/** Gọi khi refresh thất bại (hết phiên). Providers đăng ký để xóa user khỏi state. */
export function setAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

/** Nhiều request cùng gặp 401 thì dùng chung một lần refresh. */
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

// ---- Request ----------------------------------------------------------------

function send(method: string, path: string, options: RequestOptions) {
  // `skipAuthRefresh` chỉ dùng trong request(); để lọt vào init thì fetch cũng bỏ qua.
  const { body, headers, ...init } = options;
  const isFormData = body instanceof FormData;

  return fetch(`${BASE_URL}${path}`, {
    ...init,
    method,
    // Token nằm trong cookie httpOnly do backend set, FE không đọc / lưu token.
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      // Backend chỉ nhận JSON hoặc multipart (FormData tự đặt Content-Type kèm boundary).
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

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
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

  const payload = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !payload || payload.errors?.length) {
    throw new ApiError(
      res.status,
      payload?.errors?.length
        ? payload.errors
        : [{ message: 'Có lỗi xảy ra, vui lòng thử lại' }],
    );
  }
  return payload.data as T;
}

export const api = {
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
