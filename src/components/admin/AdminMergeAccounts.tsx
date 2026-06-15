import { useState, useEffect, useCallback } from "react";
import { useConfirm } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

const MERGE_API = "https://functions.poehali.dev/832b8fe2-55d9-4f1c-9d1e-4647ff305f32";
const ADMIN_USERS_API = "https://functions.poehali.dev/3048e78f-8bfe-4300-b910-2752590fa3ab";

function getAdminToken() { return localStorage.getItem("admin_token") || ""; }

interface MergeRequest {
  id: number;
  source_user_id: number;
  target_user_id: number;
  source_name: string;
  source_email: string;
  target_name: string;
  target_email: string;
  triggered_by: string;
  status: string;
  merge_summary: Record<string, unknown> | null;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
}

interface UserSearchResult { id: number; name: string; email: string; }

const STATUS_BADGE: Record<string, JSX.Element> = {
  pending_email:  <Badge variant="outline" className="text-amber-600 border-amber-300">Ожидает кода</Badge>,
  confirmed:      <Badge variant="outline" className="text-blue-600 border-blue-300">Подтверждён</Badge>,
  completed:      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Выполнено</Badge>,
  cancelled:      <Badge variant="outline" className="text-gray-400">Отменён</Badge>,
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminMergeAccounts() {
  const [showConfirm, ConfirmDialog] = useConfirm();
  const [requests, setRequests] = useState<MergeRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  // Форма ручного слияния
  const [sourceInput, setSourceInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [sourceUser, setSourceUser] = useState<UserSearchResult | null>(null);
  const [targetUser, setTargetUser] = useState<UserSearchResult | null>(null);
  const [searchingSource, setSearchingSource] = useState(false);
  const [searchingTarget, setSearchingTarget] = useState(false);
  const [merging, setMerging] = useState(false);
  const [manualResult, setManualResult] = useState<Record<string, unknown> | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ action: "admin_list", page: String(page), per_page: "20" });
      if (statusFilter !== "all") qs.set("status", statusFilter);
      const res = await fetch(`${MERGE_API}/?${qs}`, {
        headers: { "X-Admin-Token": getAdminToken() },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Ошибка загрузки"); return; }
      setRequests(data.requests || []);
      setTotal(data.total || 0);
    } catch { toast.error("Ошибка соединения"); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const searchUser = async (query: string, isSource: boolean) => {
    if (!query.trim()) return;
    if (isSource) setSearchingSource(true); else setSearchingTarget(true);
    try {
      const res = await fetch(`${ADMIN_USERS_API}?search=${encodeURIComponent(query)}&per_page=5`, {
        headers: { "X-Admin-Token": getAdminToken() },
      });
      const data = await res.json();
      const users: UserSearchResult[] = data.users || [];
      if (users.length === 1) {
        if (isSource) setSourceUser(users[0]); else setTargetUser(users[0]);
      } else if (users.length > 1) {
        toast.info(`Найдено ${users.length} пользователей — уточните запрос`);
      } else {
        toast.error("Пользователь не найден");
      }
    } catch { toast.error("Ошибка поиска"); }
    finally { if (isSource) setSearchingSource(false); else setSearchingTarget(false); }
  };

  const handleManualMerge = async () => {
    if (!sourceUser || !targetUser) { toast.error("Выберите оба аккаунта"); return; }
    if (sourceUser.id === targetUser.id) { toast.error("Нельзя объединить аккаунт сам с собой"); return; }
    if (!(await showConfirm({ title: "Объединить аккаунты?", description: `Объединить #${sourceUser.id} → #${targetUser.id}? Это действие необратимо.`, confirmLabel: "Объединить", variant: "destructive" }))) return;
    setMerging(true);
    setManualResult(null);
    try {
      const res = await fetch(`${MERGE_API}/?action=admin_merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken() },
        body: JSON.stringify({ source_user_id: sourceUser.id, target_user_id: targetUser.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Ошибка слияния"); return; }
      setManualResult(data.summary);
      toast.success("Аккаунты объединены!");
      setSourceUser(null); setTargetUser(null); setSourceInput(""); setTargetInput("");
      await loadRequests();
    } catch { toast.error("Ошибка соединения"); }
    finally { setMerging(false); }
  };

  const handleCancel = async (id: number) => {
    try {
      const res = await fetch(`${MERGE_API}/?action=admin_cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken() },
        body: JSON.stringify({ merge_request_id: id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Ошибка"); return; }
      toast.success("Запрос отменён");
      loadRequests();
    } catch { toast.error("Ошибка соединения"); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {ConfirmDialog}
      <div>
        <h2 className="text-xl font-bold">Объединение аккаунтов</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Слияние дубликатов, возникших при входе через ВКонтакте без передачи email.
        </p>
      </div>

      {/* Ручное слияние */}
      <div className="border rounded-2xl p-5 space-y-4 bg-card">
        <div className="flex items-center gap-2 font-semibold">
          <Icon name="GitMerge" size={16} className="text-primary" />
          Ручное слияние
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Дубль (будет деактивирован)</label>
            <div className="flex gap-2">
              <Input
                placeholder="ID, email или имя"
                value={sourceInput}
                onChange={(e) => { setSourceInput(e.target.value); setSourceUser(null); }}
                onKeyDown={(e) => e.key === "Enter" && searchUser(sourceInput, true)}
                className="flex-1"
              />
              <Button size="sm" variant="outline" onClick={() => searchUser(sourceInput, true)} disabled={searchingSource}>
                {searchingSource ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Search" size={14} />}
              </Button>
            </div>
            {sourceUser && (
              <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-sm">
                <Icon name="User" size={14} className="text-rose-500 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium truncate">#{sourceUser.id} {sourceUser.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{sourceUser.email}</div>
                </div>
                <button onClick={() => setSourceUser(null)} className="ml-auto text-muted-foreground hover:text-foreground"><Icon name="X" size={12} /></button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Основной (данные сохранятся)</label>
            <div className="flex gap-2">
              <Input
                placeholder="ID, email или имя"
                value={targetInput}
                onChange={(e) => { setTargetInput(e.target.value); setTargetUser(null); }}
                onKeyDown={(e) => e.key === "Enter" && searchUser(targetInput, false)}
                className="flex-1"
              />
              <Button size="sm" variant="outline" onClick={() => searchUser(targetInput, false)} disabled={searchingTarget}>
                {searchingTarget ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Search" size={14} />}
              </Button>
            </div>
            {targetUser && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                <Icon name="User" size={14} className="text-green-600 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium truncate">#{targetUser.id} {targetUser.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{targetUser.email}</div>
                </div>
                <button onClick={() => setTargetUser(null)} className="ml-auto text-muted-foreground hover:text-foreground"><Icon name="X" size={12} /></button>
              </div>
            )}
          </div>
        </div>

        {sourceUser && targetUser && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            <Icon name="AlertTriangle" size={14} className="text-amber-600 shrink-0" />
            <span>
              <b>#{sourceUser.id} {sourceUser.name}</b> будет деактивирован, все его данные перейдут на{" "}
              <b>#{targetUser.id} {targetUser.name}</b>. Действие необратимо.
            </span>
          </div>
        )}

        {manualResult && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm space-y-1">
            <div className="font-medium text-green-700">Слияние выполнено:</div>
            <div className="text-muted-foreground">
              Записей: {String(manualResult.signups_moved ?? 0)} · Бронирований: {String(manualResult.bookings_moved ?? 0)} ·
              Ролей: {String(manualResult.roles_moved ?? 0)} · VK привязан: {manualResult.vk_linked ? "да" : "нет"}
            </div>
          </div>
        )}

        <Button
          onClick={handleManualMerge}
          disabled={!sourceUser || !targetUser || merging}
          className="gap-1.5"
          variant="destructive"
        >
          {merging
            ? <><Icon name="Loader2" size={14} className="animate-spin" />Объединяем...</>
            : <><Icon name="GitMerge" size={14} />Объединить аккаунты</>}
        </Button>
      </div>

      {/* История запросов */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="font-semibold flex items-center gap-2">
            <Icon name="Clock" size={15} />
            История запросов
            {total > 0 && <Badge variant="secondary">{total}</Badge>}
          </div>
          <div className="flex gap-1 flex-wrap">
            {["all", "pending_email", "completed", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {{ all: "Все", pending_email: "Ожидают", completed: "Выполнены", cancelled: "Отменены" }[s]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <Icon name="GitMerge" size={28} className="mx-auto mb-2 opacity-30" />
            Нет запросов
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="border rounded-xl p-4 bg-card space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    <div className="text-muted-foreground">#{r.id}</div>
                    <div>
                      <span className="font-medium text-rose-600">#{r.source_user_id} {r.source_name}</span>
                      <span className="text-xs text-muted-foreground ml-1">({r.source_email})</span>
                    </div>
                    <Icon name="ArrowRight" size={14} className="text-muted-foreground" />
                    <div>
                      <span className="font-medium text-green-700">#{r.target_user_id} {r.target_name}</span>
                      <span className="text-xs text-muted-foreground ml-1">({r.target_email})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {STATUS_BADGE[r.status] ?? <Badge variant="outline">{r.status}</Badge>}
                    <Badge variant="outline" className="text-xs">
                      {r.triggered_by === "admin" ? "Админ" : "VK вход"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Создан: {fmtDate(r.created_at)}</span>
                  {r.completed_at && <span>Выполнен: {fmtDate(r.completed_at)}</span>}
                  {r.merge_summary && (
                    <span className="text-green-600">
                      Записей: {String((r.merge_summary as Record<string, unknown>).signups_moved ?? 0)},
                      ролей: {String((r.merge_summary as Record<string, unknown>).roles_moved ?? 0)}
                    </span>
                  )}
                </div>

                {r.status === "pending_email" && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleCancel(r.id)}>
                    <Icon name="X" size={12} className="mr-1" />Отменить
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Назад</Button>
            <span className="text-sm text-muted-foreground">Стр. {page} из {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>Вперёд</Button>
          </div>
        )}
      </div>
    </div>
  );
}