import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { crmApi, CrmClient } from "@/lib/crm-api";

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

export default function ClientsList({ onOpenClient, onAddExternal, onImportCsv }: ClientsListProps) {
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const res = await crmApi.listClients(q);
      setClients(res.clients || []);
    } catch (e) {
      console.error("CRM listClients failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search.trim());
  };

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
            <h3 className="font-semibold mb-1">Пока нет гостей</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Гости появятся автоматически, когда они запишутся на ваше событие
            </p>
            <Button size="sm" onClick={onAddExternal} className="gap-1.5">
              <Icon name="UserPlus" size={14} />
              Добавить вручную
            </Button>
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
        Всего гостей: <span className="font-medium text-foreground">{clients.length}</span>
      </div>
    </div>
  );
}