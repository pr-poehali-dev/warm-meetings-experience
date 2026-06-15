import { useEffect, useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  crmApi,
  CrmClient,
  CrmTag,
  CrmSegment,
  CrmClientsFilters,
} from "@/lib/crm-api";

interface ClientsListProps {
  onOpenClient: (key: string) => void;
  onAddExternal: () => void;
  onImportCsv: () => void;
}

function formatMoney(n: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return "—";
  }
}

const SEGMENTS: { key: CrmSegment; label: string; icon: string; color: string }[] = [
  { key: "vip", label: "VIP", icon: "Crown", color: "text-amber-500" },
  { key: "regular", label: "Постоянные", icon: "Repeat", color: "text-emerald-500" },
  { key: "newbie", label: "Новички", icon: "Sparkles", color: "text-sky-500" },
  { key: "sleeping", label: "Давно не были", icon: "Moon", color: "text-violet-500" },
];

const SOURCES: { key: "event" | "master" | "external"; label: string; icon: string }[] = [
  { key: "event", label: "С событий", icon: "CalendarDays" },
  { key: "master", label: "От мастера", icon: "Flame" },
  { key: "external", label: "Добавлены вручную", icon: "UserPlus" },
];

export default function ClientsList({ onOpenClient, onAddExternal, onImportCsv }: ClientsListProps) {
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tags, setTags] = useState<CrmTag[]>([]);

  // Активные фильтры
  const [segment, setSegment] = useState<CrmSegment | null>(null);
  const [source, setSource] = useState<"event" | "master" | "external" | null>(null);
  const [tagId, setTagId] = useState<number | null>(null);
  const [segCounts, setSegCounts] = useState<Record<CrmSegment, number> | null>(null);
  const [totalAll, setTotalAll] = useState(0);

  const load = useCallback(
    async (q: string, seg: CrmSegment | null, src: typeof source, tid: number | null) => {
      setLoading(true);
      try {
        const filters: CrmClientsFilters = {};
        if (q) filters.search = q;
        if (seg) filters.segment = seg;
        if (src) filters.source = src;
        if (tid) filters.tag_id = tid;
        const res = await crmApi.listClients(filters);
        setClients(res.clients || []);
        if (res.segment_counts) setSegCounts(res.segment_counts);
        if (typeof res.total_all === "number") setTotalAll(res.total_all);
      } catch (e) {
        console.error("CRM listClients failed", e);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(search, segment, source, tagId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, source, tagId]);

  useEffect(() => {
    crmApi.listTags().then((r) => setTags(r.tags || [])).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search.trim(), segment, source, tagId);
  };

  const toggleSegment = (s: CrmSegment) => setSegment((cur) => (cur === s ? null : s));
  const toggleSource = (s: typeof source) => setSource((cur) => (cur === s ? null : s));
  const resetFilters = () => {
    setSegment(null);
    setSource(null);
    setTagId(null);
    setSearch("");
    load("", null, null, null);
  };

  const hasFilters = !!(segment || source || tagId || search);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] flex gap-2">
          <div className="relative flex-1">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени, телефону, email…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Найти</Button>
        </form>
        <Button size="sm" variant="outline" onClick={onImportCsv} className="gap-1.5">
          <Icon name="Upload" size={14} />
          Импорт CSV
        </Button>
        <Button size="sm" onClick={onAddExternal} className="gap-1.5">
          <Icon name="UserPlus" size={14} />
          Добавить гостя
        </Button>
      </div>

      {/* Сегменты */}
      <div className="flex flex-wrap items-center gap-2">
        {SEGMENTS.map((s) => {
          const active = segment === s.key;
          const count = segCounts?.[s.key] ?? 0;
          return (
            <button
              key={s.key}
              onClick={() => toggleSegment(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:border-primary/50"
              }`}
            >
              <Icon name={s.icon} size={13} className={active ? "" : s.color} />
              {s.label}
              <span className={`tabular-nums ${active ? "opacity-90" : "text-muted-foreground"}`}>{count}</span>
            </button>
          );
        })}
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground"
          >
            <Icon name="X" size={13} />
            Сбросить
          </button>
        )}
      </div>

      {/* Источники + теги */}
      <div className="flex flex-wrap items-center gap-2">
        {SOURCES.map((s) => {
          const active = source === s.key;
          return (
            <button
              key={s.key}
              onClick={() => toggleSource(s.key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                active
                  ? "bg-muted border-foreground/30 text-foreground"
                  : "bg-background text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Icon name={s.icon} size={12} />
              {s.label}
            </button>
          );
        })}
        {tags.length > 0 && <span className="w-px h-4 bg-border mx-1" />}
        {tags.map((t) => {
          const active = tagId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTagId(active ? null : t.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-colors"
              style={
                active
                  ? { background: t.color, borderColor: t.color, color: "#fff" }
                  : { borderColor: t.color, color: t.color }
              }
            >
              <Icon name="Tag" size={11} />
              {t.name}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <Card className="border-dashed border-0 shadow-sm">
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Icon name="Users" size={24} className="text-primary" />
            </div>
            <h3 className="font-semibold mb-1">{hasFilters ? "Никого не нашлось" : "Пока нет гостей"}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {hasFilters
                ? "Попробуйте изменить фильтры или сбросить их"
                : "Гости появятся автоматически, когда они запишутся на ваше событие"}
            </p>
            {hasFilters ? (
              <Button size="sm" variant="outline" onClick={resetFilters} className="gap-1.5">
                <Icon name="X" size={14} />
                Сбросить фильтры
              </Button>
            ) : (
              <Button size="sm" onClick={onAddExternal} className="gap-1.5">
                <Icon name="UserPlus" size={14} />
                Добавить вручную
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Имя</th>
                  <th className="text-left px-3 py-2 font-semibold hidden md:table-cell">Контакты</th>
                  <th className="text-right px-3 py-2 font-semibold">Визиты</th>
                  <th className="text-right px-3 py-2 font-semibold hidden sm:table-cell">Траты</th>
                  <th className="text-left px-3 py-2 font-semibold hidden lg:table-cell">Теги</th>
                  <th className="text-right px-3 py-2 font-semibold hidden md:table-cell">Последний визит</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.client_key}
                    onClick={() => onOpenClient(c.client_key)}
                    className="border-t border-border/50 hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium flex items-center gap-1.5">
                        {c.name || "Без имени"}
                        {c.segments?.includes("vip") && (
                          <Icon name="Crown" size={12} className="text-amber-500" />
                        )}
                        <span className="flex items-center gap-0.5">
                          {c.sources.includes("event") && (
                            <Icon name="CalendarDays" size={11} className="text-emerald-500" fallback="Calendar" />
                          )}
                          {c.sources.includes("master") && (
                            <Icon name="Flame" size={11} className="text-orange-500" />
                          )}
                          {c.sources.includes("external") && (
                            <Icon name="UserPlus" size={11} className="text-muted-foreground" />
                          )}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground md:hidden">
                        {c.phone || c.email || c.telegram || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground">
                      {c.phone && <div className="flex items-center gap-1"><Icon name="Phone" size={11} />{c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1 text-xs"><Icon name="Mail" size={11} />{c.email}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{c.visits_count}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums hidden sm:table-cell">{formatMoney(c.total_spent)}</td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <Badge key={t.id} variant="outline" className="text-[10px] py-0" style={{ borderColor: t.color, color: t.color }}>
                            {t.name}
                          </Badge>
                        ))}
                        {c.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{c.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground hidden md:table-cell text-xs">
                      {formatDate(c.last_visit_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="text-xs text-muted-foreground px-1">
        {hasFilters ? (
          <>Найдено: <span className="font-medium text-foreground">{clients.length}</span> из {totalAll}</>
        ) : (
          <>Всего гостей: <span className="font-medium text-foreground">{clients.length}</span></>
        )}
      </div>
    </div>
  );
}
