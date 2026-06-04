export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchWithRetry(url: string, options?: RequestInit, retries = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export async function request(url: string, options?: RequestInit) {
  const res = await fetchWithRetry(url, options);
  const data = await res.json();
  if (!res.ok) throw new HttpError(data.error || "Что-то пошло не так", res.status);
  return data;
}

function handleUnauthorized(scope: "user" | "admin") {
  if (scope === "admin") {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_token_expires");
  } else {
    localStorage.removeItem("user_token");
    localStorage.removeItem("user_data");
  }
  try {
    window.dispatchEvent(new CustomEvent("auth:unauthorized", { detail: { scope } }));
  } catch {
    /* ignore */
  }
}

export async function authenticatedRequest(url: string, options?: RequestInit) {
  const token = localStorage.getItem("user_token") || "";
  const res = await fetchWithRetry(url, {
    ...options,
    headers: {
      ...options?.headers,
      "X-Session-Token": token,
    },
  });
  let data: { error?: string } = {};
  try { data = await res.json(); } catch { /* not json */ }
  if (res.status === 401) {
    handleUnauthorized("user");
    throw new HttpError(data.error || "Сессия истекла", 401);
  }
  if (!res.ok) throw new HttpError(data.error || "Что-то пошло не так", res.status);
  return data;
}

export async function adminModerationRequest(url: string, options?: RequestInit) {
  const adminToken = localStorage.getItem("admin_token") || "";
  const userToken = localStorage.getItem("user_token") || "";
  const usingAdmin = !!adminToken;
  const res = await fetchWithRetry(url, {
    ...options,
    headers: {
      ...options?.headers,
      ...(usingAdmin ? { "X-Admin-Token": adminToken } : { "X-Session-Token": userToken }),
    },
  });
  let data: { error?: string } = {};
  try { data = await res.json(); } catch { /* not json */ }
  if (res.status === 401 || res.status === 403) {
    handleUnauthorized(usingAdmin ? "admin" : "user");
    throw new HttpError(data.error || "Сессия истекла", res.status);
  }
  if (!res.ok) throw new HttpError(data.error || "Что-то пошло не так", res.status);
  return data;
}