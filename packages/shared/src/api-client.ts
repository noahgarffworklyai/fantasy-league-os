export type ApiClientOptions = {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, getToken } = options;

  async function request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string>),
    };

    if (init.body != null && init.body !== '') {
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
    }

    const token = getToken ? await getToken() : null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        headers,
      });
    } catch (error) {
      throw new ApiError(
        `Cannot reach API at ${baseUrl}. Is the server running? Phone and Mac must be on the same Wi‑Fi.`,
        0,
        error,
      );
    }

    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        const preview = text.trimStart().slice(0, 120);
        const looksLikeHtml =
          preview.startsWith('<!DOCTYPE') ||
          preview.startsWith('<html') ||
          preview.startsWith('<');
        throw new ApiError(
          looksLikeHtml
            ? `Server returned HTML instead of JSON (${response.status}). Check that the API is running at ${baseUrl}.`
            : `Invalid JSON response (${response.status}): ${preview}`,
          response.status,
          text,
        );
      }
    }

    if (!response.ok) {
      const payload = body as { message?: string; error?: string } | null;
      throw new ApiError(
        payload?.message ?? payload?.error ?? `Request failed (${response.status})`,
        response.status,
        body,
      );
    }

    return body as T;
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, data?: unknown) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
    put: <T>(path: string, data?: unknown) =>
      request<T>(path, { method: 'PUT', body: JSON.stringify(data ?? {}) }),
    patch: <T>(path: string, data?: unknown) =>
      request<T>(path, { method: 'PATCH', body: JSON.stringify(data ?? {}) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
