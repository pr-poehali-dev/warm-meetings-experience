export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new HttpError(data.error || "Request failed", res.status);
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
  const res = await fetch(url, {
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
  if (!res.ok) throw new HttpError(data.error || "Request failed", res.status);
  return data;
}

export async function adminModerationRequest(url: string, options?: RequestInit) {
  const adminToken = localStorage.getItem("admin_token") || "";
  const userToken = localStorage.getItem("user_token") || "";
  const usingAdmin = !!adminToken;
  const res = await fetch(url, {
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
  if (!res.ok) throw new HttpError(data.error || "Request failed", res.status);
  return data;
}