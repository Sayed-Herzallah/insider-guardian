import { REST_BASE_URL } from '@/config/api';

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, string[]>;

  constructor(status: number, errorDetail: ApiErrorDetail) {
    super(errorDetail.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = errorDetail.code;
    this.details = errorDetail.details;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

export const getTokens = () => {
  const access = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  return { access, refresh };
};

export const saveTokens = (access: string, refresh?: string) => {
  localStorage.setItem('access_token', access);
  if (refresh) {
    localStorage.setItem('refresh_token', refresh);
  }
};

export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

async function handleRefresh(): Promise<string> {
  const { refresh } = getTokens();
  if (!refresh) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${REST_BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearTokens();
    window.dispatchEvent(new Event('unauthorized'));
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  const newAccess = data.access;
  const newRefresh = data.refresh || refresh;
  saveTokens(newAccess, newRefresh);
  return newAccess;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { access } = getTokens();
  const headers = new Headers(options.headers || {});

  if (access && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${access}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 seconds timeout

  const config: RequestInit = {
    ...options,
    headers,
    signal: options.signal || controller.signal,
  };

  const url = path.startsWith('http') ? path : `${REST_BASE_URL}${path}`;

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (response.status === 401 && !path.includes('/auth/login/') && !path.includes('/auth/token/refresh/')) {
      if (!isRefreshing) {
        isRefreshing = true;
        handleRefresh()
          .then((newToken) => {
            isRefreshing = false;
            onRefreshed(newToken);
          })
          .catch((err) => {
            isRefreshing = false;
            refreshSubscribers = [];
            throw err;
          });
      }

      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          headers.set('Authorization', `Bearer ${newToken}`);
          
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 2000);

          fetch(url, { ...config, headers, signal: retryController.signal })
            .then(async (res) => {
              clearTimeout(retryTimeoutId);
              if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                reject(new ApiError(res.status, {
                  code: errorData.error?.code || 'error',
                  message: errorData.error?.message || 'Request failed',
                  details: errorData.error?.details,
                }));
              } else {
                resolve(res.status === 244 || res.status === 204 ? (null as any) : await res.json());
              }
            })
            .catch((err) => {
              clearTimeout(retryTimeoutId);
              reject(err);
            });
        });
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, {
        code: errorData.error?.code || 'error',
        message: errorData.error?.message || 'Request failed',
        details: errorData.error?.details,
      });
    }

    if (response.status === 204 || response.status === 244) {
      return null as any;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(504, {
        code: 'timeout',
        message: 'Request timed out',
      });
    }
    throw new ApiError(500, {
      code: 'network_error',
      message: error instanceof Error ? error.message : 'Network request failed',
    });
  }
}
