import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import func2url from "../../../backend/func2url.json";

type Tab = "notifications" | "tg_channels";

const API = (func2url as Record<string, string>)["admin-users"];

interface NotificationItem {
  id: number;
  channel: string;
  event_type: string;
  recipient: string | null;
  subject: string | null;
  status: "success" | "failed";
  error_code: string | null;
  error_text: string | null;
  provider_resp: string | null;
  user_id: number | null;
  related_id: number | null;
  created_at: string;
}

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

interface Stats24h {
  ok_24h: number;
  fail_24h: number;
  critical_24h: number;
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
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
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

const CHANNEL_LABEL: Record<string, { label: string; icon: string; color: string }> = {
  email: { label: "Email", icon: "Mail", color: "bg-blue-100 text-blue-800" },
  telegram: { label: "Telegram", icon: "Send", color: "bg-sky-100 text-sky-800" },
  vk: { label: "VK", icon: "MessageCircle", color: "bg-indigo-100 text-indigo-800" },
};

const EVENT_LABEL: Record<string, string> = {
  master_booking_new: "Новая запись к мастеру",
  client_booking_created: "Заявка клиента принята",
  client_booking_confirmed: "Подтверждение записи",
  client_booking_canceled: "Отмена записи",
  event_signup: "Запись на событие",
  organizer_alert: "Уведомление организатору",
  user_registered: "Регистрация пользователя",
  master_created: "Создан профиль мастера",
};

export default function AdminNotifications() {
  const [tab, setTab] = useState<Tab>("notifications");

  // --- Журнал уведомлений ---
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats24h>({ ok_24h: 0, fail_24h: 0, critical_24h: 0 });
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selected, setSelected] = useState<NotificationItem | null>(null);

  // --- TG публикации ---
  const [tgItems, setTgItems] = useState<TgPublication[]>([]);
  const [tgTotal, setTgTotal] = useState(0);
  const [tgStats, setTgStats] = useState<TgStats>({ sent_total: 0, error_total: 0 });
  const [tgPage, setTgPage] = useState(1);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgStatus, setTgStatus] = useState<string>("all");
  const [tgSearch, setTgSearch] = useState<string>("");
  const [tgSearchInput, setTgSearchInput] = useState<string>("");

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("resource", "notifications");
      params.set("page", String(page));
      params.set("per_page", String(perPage));
      if (status !== "all") params.set("status", status);
      if (channel !== "all") params.set("channel", channel);
      if (search) params.set("search", search);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await fetch(`${API}?${params.toString()}`, {
        headers: { "X-Admin-Token": getAdminToken() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
      setItems(data.items || []);
      setTotal(data.total || 0);
      setStats(data.stats_24h || { ok_24h: 0, fail_24h: 0, critical_24h: 0 });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, status, channel, search, dateFrom, dateTo]);

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

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "tg_channels") loadTg(); }, [tab, loadTg]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const tgTotalPages = Math.max(1, Math.ceil(tgTotal / 50));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Icon name="Bell" size={28} className="text-amber-600" />
        <div>
          <h1 className="text-2xl font-bold">Уведомления</h1>
          <p className="text-sm text-gray-500">Журнал отправок email, Telegram, VK и публикаций в каналы</p>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("notifications")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "notifications" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Icon name="Bell" size={13} /> Журнал уведомлений
        </button>
        <button
          onClick={() => setTab("tg_channels")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "tg_channels" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Icon name="Send" size={13} /> Публикации в TG-каналы
          {tgStats.error_total > 0 && (
            <span className="ml-1 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{tgStats.error_total}</span>
          )}
        </button>
      </div>

      {tab === "notifications" && (
        <>
          {/* Сводка за 24ч */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">Успешно за 24ч</div>
                  <div className="text-2xl font-bold text-emerald-600">{stats.ok_24h}</div>
                </div>
                <Icon name="CircleCheck" size={32} className="text-emerald-500" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">Ошибки за 24ч</div>
                  <div className="text-2xl font-bold text-rose-600">{stats.fail_24h}</div>
                </div>
                <Icon name="CircleAlert" size={32} className="text-rose-500" />
              </CardContent>
            </Card>
            <Card className={stats.critical_24h > 0 ? "border-red-300 bg-red-50" : ""}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">Критические (401/403)</div>
                  <div className="text-2xl font-bold text-red-700">{stats.critical_24h}</div>
                  {stats.critical_24h > 0 && (
                    <div className="text-xs text-red-700 mt-1">Проверь API-ключи!</div>
                  )}
                </div>
                <Icon name="ShieldAlert" size={32} className="text-red-600" />
              </CardContent>
            </Card>
          </div>

          {/* Фильтры */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Фильтры</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => { setDateFrom(yesterday); setDateTo(yesterday); setPage(1); }}>
                    Вчера
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setDateFrom(today); setDateTo(today); setPage(1); }}>
                    Сегодня
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); setStatus("all"); setChannel("all"); setSearch(""); setSearchInput(""); setPage(1); }}>
                    Сбросить
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="success">Успех</SelectItem>
                  <SelectItem value="failed">Ошибки</SelectItem>
                </SelectContent>
              </Select>
              <Select value={channel} onValueChange={(v) => { setChannel(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Канал" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все каналы</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="vk">VK</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Поиск по получателю / ошибке"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { setSearch(searchInput); setPage(1); }
                }}
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">С:</label>
                <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">По:</label>
                <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { setSearch(searchInput); setPage(1); }} className="flex-1">
                  <Icon name="Search" size={16} className="mr-2" /> Найти
                </Button>
                <Button variant="outline" onClick={() => load()} title="Обновить">
                  <Icon name="RefreshCw" size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Таблица */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Загрузка…</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Записей нет</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-left">
                        <th className="p-3">Время</th>
                        <th className="p-3">Канал</th>
                        <th className="p-3">Событие</th>
                        <th className="p-3">Получатель</th>
                        <th className="p-3">Статус</th>
                        <th className="p-3">Детали</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => {
                        const ch = CHANNEL_LABEL[it.channel] || { label: it.channel, icon: "Mail", color: "bg-gray-100" };
                        const isCritical =
                          it.status === "failed" &&
                          (it.error_code === "401" || it.error_code === "403" ||
                           (it.error_text || "").toLowerCase().includes("unauthorized") ||
                           (it.error_text || "").toLowerCase().includes("forbidden"));
                        return (
                          <tr key={it.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-gray-600 whitespace-nowrap">{formatDate(it.created_at)}</td>
                            <td className="p-3">
                              <Badge variant="secondary" className={ch.color}>
                                <Icon name={ch.icon} size={12} className="mr-1" />
                                {ch.label}
                              </Badge>
                            </td>
                            <td className="p-3 text-gray-700">{EVENT_LABEL[it.event_type] || it.event_type}</td>
                            <td className="p-3 text-gray-700 max-w-[200px] truncate" title={it.recipient || ""}>
                              {it.recipient || "—"}
                            </td>
                            <td className="p-3">
                              {it.status === "success" ? (
                                <Badge className="bg-emerald-100 text-emerald-800">
                                  <Icon name="Check" size={12} className="mr-1" /> ОК
                                </Badge>
                              ) : (
                                <Badge className={isCritical ? "bg-red-200 text-red-900" : "bg-rose-100 text-rose-800"}>
                                  <Icon name="X" size={12} className="mr-1" />
                                  {isCritical ? "Критично" : "Ошибка"}
                                </Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <Button size="sm" variant="ghost" onClick={() => setSelected(it)}>
                                <Icon name="Eye" size={14} className="mr-1" /> Открыть
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Пагинация */}
          {total > perPage && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">Всего: {total}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <Icon name="ChevronLeft" size={14} />
                </Button>
                <div className="text-sm py-1.5">{page} / {totalPages}</div>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <Icon name="ChevronRight" size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "tg_channels" && (
        <>
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
        </>
      )}

      {/* Детали записи уведомления */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали уведомления #{selected?.id}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Канал:</span> {CHANNEL_LABEL[selected.channel]?.label || selected.channel}</div>
                <div><span className="text-gray-500">Статус:</span> {selected.status === "success" ? "Успех" : "Ошибка"}</div>
                <div><span className="text-gray-500">Событие:</span> {EVENT_LABEL[selected.event_type] || selected.event_type}</div>
                <div><span className="text-gray-500">Время:</span> {formatDate(selected.created_at)}</div>
                <div className="col-span-2"><span className="text-gray-500">Получатель:</span> {selected.recipient || "—"}</div>
                {selected.subject && (
                  <div className="col-span-2"><span className="text-gray-500">Тема:</span> {selected.subject}</div>
                )}
              </div>
              {selected.error_text && (
                <div>
                  <div className="text-gray-500 mb-1">Ошибка {selected.error_code ? `(код ${selected.error_code})` : ""}:</div>
                  <pre className="bg-red-50 border border-red-200 rounded p-3 text-xs whitespace-pre-wrap break-words">{selected.error_text}</pre>
                </div>
              )}
              {selected.provider_resp && (
                <div>
                  <div className="text-gray-500 mb-1">Ответ сервиса:</div>
                  <pre className="bg-gray-50 border rounded p-3 text-xs whitespace-pre-wrap break-words">{selected.provider_resp}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
