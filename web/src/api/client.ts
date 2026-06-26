const BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

function buildUrl(url: string, params?: Record<string, any>): string {
  const fullUrl = new URL(url, window.location.origin);
  if (params) {
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        fullUrl.searchParams.append(key, params[key]);
      }
    });
  }
  return fullUrl.pathname + fullUrl.search;
}

async function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...restOptions } = options;
  const fullUrl = BASE_URL + buildUrl(url, params);

  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...restOptions.headers,
    },
    ...restOptions,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const apiClient = {
  get: <T = any>(url: string, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(url, { ...options, method: 'GET' }),
  post: <T = any>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(url, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(url, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(url: string, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(url, { ...options, method: 'DELETE' }),
};

export default apiClient;
