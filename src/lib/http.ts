export async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function authenticatedRequest(url: string, options?: RequestInit) {
  const token = localStorage.getItem("user_token");
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      "X-Session-Token": token || "",
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
