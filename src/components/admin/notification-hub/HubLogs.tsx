import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { hubApi, LogEntry } from "./hubApi";

const CHANNEL_ICONS: Record<string, string> = {
  telegram: "Send",
  email: "Mail",
  vk: "MessageCircle",
};

const CHANNEL_LABELS: Record<string, string> = {
  telegram: "Telegram",
  email: "Email",
  vk: "ВКонтакте",
};

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<string, string> = {
  success: "Доставлено",
  failed: "Ошибка",
  pending: "В очереди",
};

function fmtDate(str: string | null) {
  if (!str) return "—";
  return new Date(str).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HubLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("per_page", "30");
    if (status !== "all") p.set("status", status);
    if (channel !== "all") p.set("channel", channel);
    hubApi
      .logs(`&${p.toString()}`)
      .then((d) => {
        setLogs(d.logs);
        setPages(d.pages || 1);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [page, status, channel]);

  useEffect(load, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="success">Доставлено</SelectItem>
            <SelectItem value="failed">Ошибка</SelectItem>
          </SelectContent>
        </Select>
        <Select value={channel} onValueChange={(v) => { setChannel(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Канал" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все каналы</SelectItem>
            <SelectItem value="telegram">Telegram</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="vk">ВКонтакте</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load}>
          <Icon name="RefreshCw" size={15} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" size={22} className="animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-2xl">
          <Icon name="History" size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Нет записей</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="rounded-xl border p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon
                    name={(CHANNEL_ICONS[l.channel] || "Bell") as "Mail"}
                    size={13}
                    className="text-muted-foreground shrink-0"
                  />
                  <span className="text-sm font-medium truncate">
                    {l.recipient || "—"}
                  </span>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0 ${STATUS_STYLES[l.status] || "bg-muted text-muted-foreground"}`}>
                  {STATUS_LABELS[l.status] || l.status}
                </span>
              </div>

              {l.subject && (
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-medium text-foreground">Тема:</span> {l.subject}
                </p>
              )}

              <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Icon name="Zap" size={9} />
                  {l.event_type}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name={(CHANNEL_ICONS[l.channel] || "Bell") as "Mail"} size={9} />
                  {CHANNEL_LABELS[l.channel] || l.channel}
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  <Icon name="Clock" size={9} />
                  {fmtDate(l.created_at)}
                </span>
              </div>

              {l.status === "failed" && l.error_text && (
                <div className="text-[11px] text-red-600 bg-red-50 rounded-lg px-2 py-1.5 flex gap-1.5">
                  <Icon name="AlertCircle" size={11} className="shrink-0 mt-0.5" />
                  {l.error_text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд
          </Button>
        </div>
      )}
    </div>
  );
}
