import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Icon from "@/components/ui/icon";
import { useStickyFilters } from "@/hooks/useStickyFilters";
import { supportAdminApi, AdminTicket } from "@/lib/support-api";
import { toast } from "sonner";
import {
  STATUS_LIST,
  STATUS_META,
  PRIORITY_META,
  CATEGORY_LABELS,
  formatDateTime,
} from "./SupportConstants";
import TicketDetailAdmin from "./TicketDetailAdmin";

export default function TicketsView() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { filters, setFilter } = useStickyFilters("support", {
    needsAttention: true,
    status: "all",
    category: "all",
    priority: "all",
    q: "",
  });
  const needsAttention = filters.needsAttention;
  const filterStatus = filters.status;
  const filterCategory = filters.category;
  const filterPriority = filters.priority;
  const [search, setSearch] = useState<string>(filters.q);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [stats, setStats] = useState<{ open_count: number; last7: number } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await supportAdminApi.listTickets({
        status: filterStatus !== "all" ? filterStatus : undefined,
        category: filterCategory !== "all" ? filterCategory : undefined,
        priority: filterPriority !== "all" ? filterPriority : undefined,
        q: search.trim() || undefined,
      });
      const filtered = needsAttention
        ? list.filter(
            (t) =>
              t.status === "open" ||
              t.status === "in_progress" ||
              t.priority === "high",
          )
        : list;
      setTickets(filtered);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const s = await supportAdminApi.stats();
      setStats({ open_count: s.open_count, last7: s.last7 });
    } catch {
      /* skip */
    }
  };

  useEffect(() => {
    load();
    loadStats();
  }, [filterStatus, filterCategory, filterPriority, needsAttention]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Активных</div>
            <div className="text-2xl font-semibold">{stats?.open_count ?? "—"}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">За 7 дней</div>
            <div className="text-2xl font-semibold">{stats?.last7 ?? "—"}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm col-span-2 sm:col-span-2">
          <CardContent className="p-3 flex items-center gap-2">
            <Icon name="Search" size={14} className="text-muted-foreground" />
            <Input
              placeholder="Поиск по теме, email или имени"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setFilter("q", search);
                  load();
                }
              }}
              className="border-0 shadow-none focus-visible:ring-0 h-8 px-0"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFilter("q", search);
                load();
              }}
            >
              Найти
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
          <button
            onClick={() => setFilter("needsAttention", true)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              needsAttention
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Требуют внимания
          </button>
          <button
            onClick={() => setFilter("needsAttention", false)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              !needsAttention
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Все
          </button>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilter("status", e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          {STATUS_LIST.map((s) => (
            <option key={s.value} value={s.value}>
              Статус: {s.label}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilter("category", e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">Категория: все</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              Категория: {l}
            </option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilter("priority", e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">Приоритет: все</option>
          <option value="high">Приоритет: высокий</option>
          <option value="medium">Приоритет: средний</option>
          <option value="low">Приоритет: низкий</option>
        </select>
      </div>

      {loading && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <Icon name="Loader2" size={20} className="animate-spin mx-auto mb-2" />
          Загружаем тикеты…
        </div>
      )}

      {!loading && tickets.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Под выбранные фильтры обращений нет.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {tickets.map((t) => {
          const meta = STATUS_META[t.status];
          const prio = PRIORITY_META[t.priority];
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(t.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSelectedId(t.id);
              }}
              className="cursor-pointer w-full text-left rounded-xl border border-border bg-card p-3 sm:p-4 hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    #{t.id} · {t.subject}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t.name || "—"} · {t.email}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${meta.cls}`}>
                    {meta.label}
                  </span>
                  <span className={`text-[11px] ${prio.cls}`}>{prio.label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span>{CATEGORY_LABELS[t.category] || t.category}</span>
                  <span className="flex items-center gap-1">
                    <Icon name="MessageSquare" size={11} />
                    {t.msg_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="Clock" size={11} />
                    {formatDateTime(t.updated_at)}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t.status === "open" && (
                    <button
                      onClick={async () => {
                        try {
                          await supportAdminApi.setStatus(t.id, "in_progress");
                          toast.success("Взял в работу");
                          load();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Ошибка");
                        }
                      }}
                      className="inline-flex items-center justify-center h-7 px-2 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50 text-[11px]"
                      title="Взять в работу"
                    >
                      <Icon name="Play" size={12} className="mr-1" />
                      В работу
                    </button>
                  )}
                  {t.status !== "closed" && (
                    <button
                      onClick={async () => {
                        try {
                          await supportAdminApi.setStatus(t.id, "closed");
                          toast.success("Закрыт");
                          load();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Ошибка");
                        }
                      }}
                      className="inline-flex items-center justify-center h-7 px-2 rounded-md border border-input text-muted-foreground hover:bg-muted text-[11px]"
                      title="Закрыть"
                    >
                      <Icon name="Check" size={12} />
                    </button>
                  )}
                  {t.email && (
                    <a
                      href={`mailto:${t.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center h-7 px-2 rounded-md border border-input text-muted-foreground hover:bg-muted"
                      title="Написать на email"
                    >
                      <Icon name="Mail" size={12} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Sheet
        open={selectedId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedId(null);
            load();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0 overflow-y-auto"
        >
          {selectedId !== null && (
            <TicketDetailAdmin
              ticketId={selectedId}
              onBack={() => {
                setSelectedId(null);
                load();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
