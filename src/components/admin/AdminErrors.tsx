import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

const ERRORS_API = "https://functions.poehali.dev/be5d8e75-ef47-40c3-a99b-5e09b3d83995";

function getAdminToken(): string {
  return localStorage.getItem("admin_token") || "";
}

interface ErrorLog {
  id: number;
  source: "frontend" | "backend";
  level: string;
  message: string;
  stack: string | null;
  url: string | null;
  function_name: string | null;
  user_id: number | null;
  count: number;
  resolved: boolean;
  created_at: string;
  last_seen_at: string;
}

type Filter = "unresolved" | "all" | "frontend" | "backend";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "unresolved", label: "Активные" },
  { id: "all", label: "Все" },
  { id: "frontend", label: "Фронтенд" },
  { id: "backend", label: "Бэкенд" },
];

function fmtDate(s: string): string {
  const d = new Date(s);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminErrors() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("unresolved");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (filter === "frontend" || filter === "backend") params.set("source", filter);
    if (filter === "unresolved") params.set("resolved", "false");
    try {
      const res = await fetch(`${ERRORS_API}?${params}`, {
        headers: { "X-Admin-Token": getAdminToken() },
      });
      if (!res.ok) throw new Error("Не удалось загрузить");
      const data = await res.json();
      setErrors(data.errors || []);
    } catch {
      toast.error("Ошибка загрузки журнала");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id: number) => {
    try {
      const res = await fetch(`${ERRORS_API}?action=resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken() },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setErrors((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true } : e)));
      toast.success("Помечено решённым");
    } catch {
      toast.error("Не удалось обновить");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Icon name="Bug" size={24} className="text-primary" />
            Журнал ошибок
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ошибки фронтенда и бэкенда. Критичные дублируются в Telegram.
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Обновить"
        >
          <Icon name="RefreshCw" size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === f.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Загрузка…</p>
      ) : errors.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Icon name="CheckCircle2" size={40} className="mx-auto mb-2 text-green-500" />
          <p className="text-sm">Ошибок нет — всё работает штатно</p>
        </div>
      ) : (
        <div className="space-y-2">
          {errors.map((e) => (
            <div
              key={e.id}
              className={`rounded-lg border p-3 ${
                e.resolved ? "border-border opacity-60" : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${
                    e.source === "backend" ? "bg-red-500" : "bg-orange-500"
                  }`}
                  title={e.source}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium break-words">{e.message}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span>{e.source === "backend" ? "Бэкенд" : "Фронтенд"}</span>
                    {(e.function_name || e.url) && (
                      <span className="truncate max-w-[220px]">{e.function_name || e.url}</span>
                    )}
                    <span>{fmtDate(e.last_seen_at)}</span>
                    {e.count > 1 && (
                      <span className="px-1.5 py-0.5 rounded bg-muted text-foreground font-medium">
                        ×{e.count}
                      </span>
                    )}
                  </div>
                  {expanded === e.id && e.stack && (
                    <pre
                      className="mt-2 p-2 rounded bg-muted text-[11px] overflow-x-auto whitespace-pre-wrap break-words max-h-64 cursor-pointer select-all"
                      title="Нажмите, чтобы скопировать"
                      onClick={() => {
                        const text = e.stack ?? "";
                        try {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(text).then(() => toast.success("Скопировано")).catch(() => {
                              const ta = document.createElement("textarea");
                              ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
                              document.body.appendChild(ta); ta.focus(); ta.select();
                              document.execCommand("copy"); document.body.removeChild(ta);
                              toast.success("Скопировано");
                            });
                          } else {
                            const ta = document.createElement("textarea");
                            ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
                            document.body.appendChild(ta); ta.focus(); ta.select();
                            document.execCommand("copy"); document.body.removeChild(ta);
                            toast.success("Скопировано");
                          }
                        } catch { toast.error("Не удалось скопировать"); }
                      }}
                    >
                      {e.stack}
                    </pre>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {e.stack && (
                    <button
                      onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Детали"
                    >
                      <Icon name={expanded === e.id ? "ChevronUp" : "ChevronDown"} size={16} />
                    </button>
                  )}
                  {!e.resolved && (
                    <button
                      onClick={() => resolve(e.id)}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-green-600"
                      title="Пометить решённым"
                    >
                      <Icon name="Check" size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}