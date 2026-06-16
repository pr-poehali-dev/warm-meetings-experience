import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import func2url from "../../../backend/func2url.json";

const API = (func2url as Record<string, string>)["admin-users"];

interface TgPublication {
  id: number;
  event_id: number;
  channel_id: number;
  message_id: number | null;
  status: string;
  error_text: string | null;
  published_at: string | null;
  event_title: string;
  event_slug: string;
  chat_title: string;
  chat_id: number;
}

interface TgStats {
  sent_total: number;
  error_total: number;
}

function getAdminToken(): string {
  return localStorage.getItem("admin_token") || "";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminNotifications() {
  const [tgItems, setTgItems] = useState<TgPublication[]>([]);
  const [tgTotal, setTgTotal] = useState(0);
  const [tgStats, setTgStats] = useState<TgStats>({ sent_total: 0, error_total: 0 });
  const [tgPage, setTgPage] = useState(1);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgStatus, setTgStatus] = useState<string>("all");
  const [tgSearch, setTgSearch] = useState<string>("");
  const [tgSearchInput, setTgSearchInput] = useState<string>("");

  const loadTg = useCallback(async () => {
    setTgLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("resource", "tg_publications");
      params.set("page", String(tgPage));
      params.set("per_page", "50");
      if (tgStatus !== "all") params.set("status", tgStatus);
      if (tgSearch) params.set("search", tgSearch);
      const res = await fetch(`${API}?${params.toString()}`, {
        headers: { "X-Admin-Token": getAdminToken() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
      setTgItems(data.items || []);
      setTgTotal(data.total || 0);
      setTgStats(data.stats || { sent_total: 0, error_total: 0 });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTgLoading(false);
    }
  }, [tgPage, tgStatus, tgSearch]);

  useEffect(() => { loadTg(); }, [loadTg]);

  const tgTotalPages = Math.max(1, Math.ceil(tgTotal / 50));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Icon name="Send" size={28} className="text-sky-600" />
        <div>
          <h1 className="text-2xl font-bold">Публикации в Telegram-каналы</h1>
          <p className="text-sm text-gray-500">
            Автопубликации событий в подключённые каналы и их статус
          </p>
        </div>
      </div>

      {/* Подсказка про единый журнал */}
      <Card className="border-sky-200 bg-sky-50/60">
        <CardContent className="p-3 flex items-center gap-2 text-sm text-sky-900">
          <Icon name="Info" size={16} className="text-sky-500 shrink-0" />
          <span>
            Журнал доставки email / Telegram / VK и статистика теперь в разделе
            <b> «Центр уведомлений»</b>.
          </span>
        </CardContent>
      </Card>

      {/* Статистика TG */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Успешно опубликовано</div>
              <div className="text-2xl font-bold text-emerald-600">{tgStats.sent_total}</div>
            </div>
            <Icon name="Send" size={32} className="text-emerald-500" />
          </CardContent>
        </Card>
        <Card className={tgStats.error_total > 0 ? "border-red-300 bg-red-50" : ""}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Ошибки отправки</div>
              <div className="text-2xl font-bold text-rose-600">{tgStats.error_total}</div>
            </div>
            <Icon name="CircleAlert" size={32} className="text-rose-500" />
          </CardContent>
        </Card>
      </div>

      {/* Фильтры TG */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-3">
          <Select value={tgStatus} onValueChange={(v) => { setTgStatus(v); setTgPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Статус" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="sent">Отправлено</SelectItem>
              <SelectItem value="error">Ошибка</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 flex-1 min-w-48">
            <Input
              placeholder="Поиск по событию / каналу"
              value={tgSearchInput}
              onChange={(e) => setTgSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setTgSearch(tgSearchInput); setTgPage(1); } }}
            />
            <Button onClick={() => { setTgSearch(tgSearchInput); setTgPage(1); }}>
              <Icon name="Search" size={16} />
            </Button>
            <Button variant="outline" onClick={() => loadTg()} title="Обновить">
              <Icon name="RefreshCw" size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Таблица TG */}
      <Card>
        <CardContent className="p-0">
          {tgLoading ? (
            <div className="p-8 text-center text-gray-500">Загрузка…</div>
          ) : tgItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Публикаций нет</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left">
                    <th className="p-3">Время</th>
                    <th className="p-3">Событие</th>
                    <th className="p-3">Канал</th>
                    <th className="p-3">Статус</th>
                    <th className="p-3">Ошибка</th>
                  </tr>
                </thead>
                <tbody>
                  {tgItems.map((it) => (
                    <tr key={it.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-gray-600 whitespace-nowrap">{formatDate(it.published_at)}</td>
                      <td className="p-3 max-w-[220px]">
                        <a
                          href={`/events/${it.event_slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline font-medium truncate block"
                          title={it.event_title}
                        >
                          {it.event_title}
                        </a>
                        <div className="text-[11px] text-muted-foreground">ID {it.event_id}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Icon name="Send" size={13} className="text-sky-500" />
                          <span className="truncate max-w-[160px]" title={it.chat_title}>{it.chat_title}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {it.status === "sent" ? (
                          <Badge className="bg-emerald-100 text-emerald-800">
                            <Icon name="Check" size={12} className="mr-1" /> Отправлено
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800">
                            <Icon name="X" size={12} className="mr-1" /> Ошибка
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-xs text-rose-600 max-w-[200px] truncate" title={it.error_text || ""}>
                        {it.error_text || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Пагинация TG */}
      {tgTotal > 50 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Всего: {tgTotal}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={tgPage <= 1} onClick={() => setTgPage((p) => p - 1)}>
              <Icon name="ChevronLeft" size={14} />
            </Button>
            <div className="text-sm py-1.5">{tgPage} / {tgTotalPages}</div>
            <Button variant="outline" size="sm" disabled={tgPage >= tgTotalPages} onClick={() => setTgPage((p) => p + 1)}>
              <Icon name="ChevronRight" size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
