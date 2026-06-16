import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const CHANNEL_LABELS: Record<string, string> = {
  telegram: "Telegram",
  email: "Email",
  vk: "ВКонтакте",
};

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
        <div className="flex justify-center py-16">
          <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Нет записей
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <Icon
                  name={l.status === "success" ? "CheckCircle2" : "XCircle"}
                  size={18}
                  className={l.status === "success" ? "text-green-500" : "text-red-500"}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                      {CHANNEL_LABELS[l.channel] || l.channel}
                    </Badge>
                    <span className="text-sm font-medium">{l.event_type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {l.recipient}
                    {l.error_text && (
                      <span className="text-red-500"> · {l.error_text}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </CardContent>
            </Card>
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
