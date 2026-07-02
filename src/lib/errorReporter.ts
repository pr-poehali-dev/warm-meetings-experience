const ERRORS_URL = "https://functions.poehali.dev/be5d8e75-ef47-40c3-a99b-5e09b3d83995";

type ErrorLevel = "error" | "fatal" | "warning";

interface ReportPayload {
  message: string;
  stack?: string;
  level?: ErrorLevel;
  context?: Record<string, unknown>;
}

// Антиспам в рамках сессии: один и тот же текст ошибки не чаще раза в 30 сек
const recent = new Map<string, number>();
const THROTTLE_MS = 30_000;

function currentUserId(): number | undefined {
  try {
    const raw =
      localStorage.getItem("user_data") || sessionStorage.getItem("user_data");
    if (!raw) return undefined;
    const u = JSON.parse(raw);
    return typeof u?.id === "number" ? u.id : undefined;
  } catch {
    return undefined;
  }
}

export function reportError({ message, stack, level = "error", context }: ReportPayload): void {
  if (!message) return;

  // Не шлём шумные/бесполезные ошибки
  if (
    message.includes("ResizeObserver loop") ||
    message.includes("Non-Error promise rejection") ||
    message === "Script error."
  ) {
    return;
  }

  const key = `${level}:${message.slice(0, 120)}`;
  const now = Date.now();
  const last = recent.get(key) || 0;
  if (now - last < THROTTLE_MS) return;
  recent.set(key, now);

  const body = JSON.stringify({
    source: "frontend",
    level,
    message: message.slice(0, 2000),
    stack: stack?.slice(0, 8000),
    url: window.location.href,
    user_agent: navigator.userAgent,
    user_id: currentUserId(),
    context,
  });

  try {
    fetch(ERRORS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // отправка ошибок не должна ломать приложение
  }
}

let installed = false;

export function installGlobalErrorHandlers(): void {
  if (installed) return;
  installed = true;

  window.addEventListener("error", (e: ErrorEvent) => {
    reportError({
      message: e.message || "Unknown error",
      stack: e.error?.stack,
      level: "error",
      context: { filename: e.filename, line: e.lineno, col: e.colno },
    });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const reason = e.reason;
    const message =
      reason instanceof Error ? reason.message : String(reason ?? "Unhandled rejection");
    reportError({
      message,
      stack: reason instanceof Error ? reason.stack : undefined,
      level: "error",
      context: { type: "unhandledrejection" },
    });
  });
}