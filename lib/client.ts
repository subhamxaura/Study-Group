// Client-side fetch wrapper for the Study-Group API (envelope { ok, data } | { ok, error })

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    credentials: 'same-origin',
  })
  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new ApiError(`Request failed (${res.status})`, res.status)
  }
  const body = json as { ok?: boolean; data?: T; error?: string }
  if (!res.ok || body.ok === false) {
    throw new ApiError(body.error || `Request failed (${res.status})`, res.status)
  }
  return body.data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** Multipart upload — must NOT set Content-Type (the browser adds the boundary). */
  upload: <T>(path: string, form: FormData) =>
    fetch(path, { method: 'POST', body: form, credentials: 'same-origin' }).then(async (res) => {
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; data?: T; error?: string }
      if (!res.ok || body.ok === false) throw new ApiError(body.error || `Upload failed (${res.status})`, res.status)
      return body.data as T
    }),
}
