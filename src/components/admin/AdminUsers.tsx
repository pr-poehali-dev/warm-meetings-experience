import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import Icon from "@/components/ui/icon";
import ConsentPhotoBadge from "@/components/ui/ConsentPhotoBadge";
import { useStickyFilters } from "@/hooks/useStickyFilters";
import { formatPhone } from "@/hooks/usePhoneMask";
import AuditLogPanel from "@/components/admin/AuditLogPanel";
import MergeAccountModal, { MergeHint } from "@/components/admin/MergeAccountModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const ADMIN_USERS_API = "https://functions.poehali.dev/3048e78f-8bfe-4300-b910-2752590fa3ab";
const MERGE_API = "https://functions.poehali.dev/832b8fe2-55d9-4f1c-9d1e-4647ff305f32";

interface UserRole {
  id: number;
  name: string;
  slug: string;
  icon: string;
  status: string;
}

interface AllRole {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  telegram: string | null;
  is_active: boolean;
  blocked_reason: "banned" | "duplicate" | null;
  created_at: string;
  consent_photo?: "yes" | "no" | null;
  roles: UserRole[];
}

function getAdminToken(): string {
  return localStorage.getItem("admin_token") || "";
}

async function adminPost(body: object) {
  const res = await fetch(ADMIN_USERS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка");
  return data;
}

function AdminMergeFromUserDialog({
  open, sourceId, sourceName, onDone, onClose,
}: { open: boolean; sourceId: number; sourceName: string; onDone: () => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [candidates, setCandidates] = useState<{ id: number; name: string; email: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [target, setTarget] = useState<{ id: number; name: string; email: string } | null>(null);
  const [merging, setMerging] = useState(false);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);

  const search = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${ADMIN_USERS_API}?search=${encodeURIComponent(q)}&per_page=5`, {
        headers: { "X-Admin-Token": getAdminToken() },
      });
      const data = await res.json();
      setCandidates((data.users || []).filter((u: { id: number }) => u.id !== sourceId));
    } catch { toast.error("Ошибка поиска"); }
    finally { setSearching(false); }
  };

  const doMerge = async () => {
    if (!target) return;
    if (!confirm(`Объединить #${sourceId} (${sourceName}) → #${target.id} (${target.name})? Необратимо.`)) return;
    setMerging(true);
    try {
      const res = await fetch(`${MERGE_API}/?action=admin_merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken() },
        body: JSON.stringify({ source_user_id: sourceId, target_user_id: target.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Ошибка"); return; }
      setSummary(data.summary);
      toast.success("Аккаунты объединены!");
      setTimeout(onDone, 1800);
    } catch { toast.error("Ошибка соединения"); }
    finally { setMerging(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="GitMerge" size={18} className="text-orange-500" />
            Объединить аккаунт #{sourceId}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm">
            <span className="font-medium text-orange-700">Дубль (будет деактивирован):</span>
            <br />#{sourceId} · {sourceName} · <span className="font-mono text-xs">@vk.local</span>
          </div>

          {summary ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm space-y-1">
              <div className="font-medium text-green-700">Слияние выполнено!</div>
              <div className="text-muted-foreground">
                Записей: {String(summary.signups_moved ?? 0)} · Бронирований: {String(summary.bookings_moved ?? 0)} ·
                Ролей: {String(summary.roles_moved ?? 0)} · VK привязан: {summary.vk_linked ? "да" : "нет"}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Найти основной аккаунт</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Имя, email или ID"
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setCandidates([]); setTarget(null); }}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                    autoFocus
                  />
                  <Button size="sm" variant="outline" onClick={search} disabled={searching}>
                    {searching ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Search" size={14} />}
                  </Button>
                </div>
              </div>

              {candidates.length > 0 && !target && (
                <div className="space-y-1">
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setTarget(c)}
                      className="w-full flex items-center gap-2 p-2.5 bg-muted/40 hover:bg-muted rounded-xl text-sm text-left transition-colors"
                    >
                      <Icon name="User" size={14} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">#{c.id} {c.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                      </div>
                      <Icon name="ArrowRight" size={12} className="ml-auto text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {candidates.length === 0 && q && !searching && (
                <p className="text-xs text-muted-foreground text-center py-2">Ничего не найдено</p>
              )}

              {target && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm">
                  <span className="font-medium text-green-700">Основной аккаунт:</span>
                  <br />#{target.id} · {target.name} · {target.email}
                  <button onClick={() => setTarget(null)} className="ml-2 text-muted-foreground hover:text-foreground">
                    <Icon name="X" size={12} />
                  </button>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={doMerge}
                  disabled={!target || merging}
                  variant="destructive"
                  className="flex-1 gap-1.5"
                >
                  {merging
                    ? <><Icon name="Loader2" size={14} className="animate-spin" />Объединяем...</>
                    : <><Icon name="GitMerge" size={14} />Объединить</>}
                </Button>
                <Button variant="ghost" onClick={onClose}>Отмена</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<AllRole[]>([]);
  const [total, setTotal] = useState(0);
  const { filters, setFilter } = useStickyFilters("users", { page: 1, q: "" });
  const page = filters.page;
  const setPage = (v: number | ((p: number) => number)) => {
    setFilter("page", typeof v === "function" ? v(page) : v);
  };
  const search = filters.q;
  const setSearch = (v: string) => setFilter("q", v);
  const [searchInput, setSearchInput] = useState<string>(filters.q);
  const [loading, setLoading] = useState(true);

  // Диалог
  const [selected, setSelected] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ name: string; phone: string; telegram: string }>({ name: "", phone: "", telegram: "" });
  const [saving, setSaving] = useState(false);
  const [blockDialog, setBlockDialog] = useState(false);
  const [mergeHint, setMergeHint] = useState<MergeHint | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      const res = await fetch(`${ADMIN_USERS_API}?${params}`, {
        headers: { "X-Admin-Token": getAdminToken() },
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_token_expires");
        toast.error("Сессия администратора истекла — войдите заново");
        setTimeout(() => window.location.reload(), 800);
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      if (data.all_roles) setAllRoles(data.all_roles);
    } catch {
      toast.error("Не удалось загрузить пользователей");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSearch = () => { setPage(1); setSearch(searchInput.trim()); };
  const handleClearSearch = () => { setSearchInput(""); setSearch(""); setPage(1); };

  const openUser = (user: User) => {
    setSelected(user);
    setEditing(false);
    setDraft({ name: user.name, phone: user.phone || "", telegram: user.telegram || "" });
  };

  const closeDialog = () => { setSelected(null); setEditing(false); };

  const syncSelected = (updated: User) => {
    setSelected(updated);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...updated } : u)));
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const data = await adminPost({ action: "update_user", user_id: selected.id, ...draft });
      syncSelected({ ...selected, ...data.user });
      toast.success("Данные обновлены");
      setEditing(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const blockUser = async (reason: "banned" | "duplicate") => {
    if (!selected) return;
    setSaving(true);
    setBlockDialog(false);
    try {
      const data = await adminPost({ action: "block_user", user_id: selected.id, reason });
      syncSelected({ ...selected, is_active: data.is_active, blocked_reason: data.blocked_reason });
      toast.success(reason === "banned" ? "Пользователь заблокирован (бан)" : "Дубликат заблокирован");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const unblockUser = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const data = await adminPost({ action: "unblock_user", user_id: selected.id });
      syncSelected({ ...selected, is_active: data.is_active, blocked_reason: data.blocked_reason });
      toast.success("Пользователь разблокирован");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const addRole = async (roleSlug: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      const data = await adminPost({ action: "add_role", user_id: selected.id, role_slug: roleSlug });
      syncSelected({ ...selected, roles: data.user.roles });
      toast.success("Роль добавлена");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async (roleSlug: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      const data = await adminPost({ action: "remove_role", user_id: selected.id, role_slug: roleSlug });
      syncSelected({ ...selected, roles: data.user.roles });
      toast.success("Роль удалена");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / 20);
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

  const activeRoleSlugs = new Set((selected?.roles ?? []).filter((r) => r.status === "active").map((r) => r.slug));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>
          <p className="text-sm text-gray-500 mt-1">Всего зарегистрировано: {total}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-2">
            <Input
              placeholder="Поиск по имени, email, телефону или заметкам..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="max-w-sm"
            />
            <Button onClick={handleSearch} variant="outline">
              <Icon name="Search" size={16} />
            </Button>
            {search && (
              <Button onClick={handleClearSearch} variant="ghost" size="sm">
                <Icon name="X" size={16} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Icon name="Loader" size={24} className="animate-spin mr-2" />
              Загрузка...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon name="Users" size={40} className="mx-auto mb-3 opacity-30" />
              <p>Пользователи не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-left">
                    <th className="pb-3 pr-4 font-medium">ID</th>
                    <th className="pb-3 pr-4 font-medium">Имя</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Телефон</th>
                    <th className="pb-3 pr-4 font-medium">Роли</th>
                    <th className="pb-3 pr-4 font-medium">Фото</th>
                    <th className="pb-3 pr-4 font-medium">Дата</th>
                    <th className="pb-3 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openUser(user)}
                    >
                      <td className="py-3 pr-4 text-gray-400">#{user.id}</td>
                      <td className="py-3 pr-4 font-medium text-gray-900">{user.name}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{user.email}</span>
                          {user.email?.endsWith("@vk.local") && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-500 border-orange-300 gap-1">
                              <Icon name="GitMerge" size={9} />
                              дубль VK
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{user.phone || "—"}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.filter((r) => r.status === "active").length > 0 ? (
                            user.roles.filter((r) => r.status === "active").map((role) => (
                              <Badge key={role.slug} variant="secondary" className="text-xs">
                                {role.icon} {role.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <ConsentPhotoBadge consent={user.consent_photo} />
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(user.created_at)}</td>
                      <td className="py-3">
                        {user.is_active ? (
                          <Badge variant="default" className="text-xs">Активен</Badge>
                        ) : user.blocked_reason === "banned" ? (
                          <Badge variant="destructive" className="text-xs">Бан</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-gray-500">Заблокирован</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                <Icon name="ChevronLeft" size={16} />
                Назад
              </Button>
              <span className="text-sm text-gray-500">Стр. {page} из {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                Вперёд
                <Icon name="ChevronRight" size={16} />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Панель пользователя */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Icon name="User" size={18} />
              {selected?.name}
              {selected?.is_active ? (
                <Badge variant="default" className="text-xs ml-1">Активен</Badge>
              ) : selected?.blocked_reason === "banned" ? (
                <Badge variant="destructive" className="text-xs ml-1">Бан</Badge>
              ) : (
                <Badge variant="outline" className="text-xs ml-1 text-gray-500">Заблокирован</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="space-y-5">
              {/* Основные данные */}
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <Label>Имя</Label>
                    <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Телефон</Label>
                    <Input type="tel" value={draft.phone} placeholder="+7(___) ___-__-__" onChange={(e) => setDraft((d) => ({ ...d, phone: formatPhone(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>Telegram</Label>
                    <Input value={draft.telegram} placeholder="@username" onChange={(e) => setDraft((d) => ({ ...d, telegram: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <span className="text-gray-500">Email</span>
                  <a href={`mailto:${selected.email}`} className="text-blue-600 hover:underline">{selected.email}</a>

                  <span className="text-gray-500">Телефон</span>
                  {selected.phone
                    ? <a href={`tel:${selected.phone}`} className="text-blue-600 hover:underline">{selected.phone}</a>
                    : <span className="text-gray-400">—</span>}

                  <span className="text-gray-500">Telegram</span>
                  {selected.telegram
                    ? <a href={`https://t.me/${selected.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selected.telegram}</a>
                    : <span className="text-gray-400">—</span>}

                  <span className="text-gray-500">Регистрация</span>
                  <span>{formatDate(selected.created_at)}</span>

                  <span className="text-gray-500">Фото в рекламе</span>
                  {selected.consent_photo
                    ? <ConsentPhotoBadge consent={selected.consent_photo} showLabel />
                    : <span className="text-gray-400">Не указано</span>}
                </div>
              )}

              {/* Роли */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Роли</p>
                <div className="flex flex-wrap gap-2">
                  {allRoles.map((role) => {
                    const has = activeRoleSlugs.has(role.slug);
                    return (
                      <button
                        key={role.slug}
                        onClick={() => has ? removeRole(role.slug) : addRole(role.slug)}
                        disabled={saving}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          has
                            ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-700"
                            : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                        }`}
                      >
                        <span>{role.icon}</span>
                        {role.name}
                        {has
                          ? <Icon name="X" size={12} className="opacity-70" />
                          : <Icon name="Plus" size={12} className="opacity-50" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t pt-4">
                <AuditLogPanel entityType="user" entityId={selected.id} />
              </div>
            </div>
          )}

          <SheetFooter className="flex-col sm:flex-row gap-2 pt-4 mt-4 border-t">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving} className="sm:mr-auto">
                  Отмена
                </Button>
                <Button onClick={saveEdit} disabled={saving}>
                  {saving && <Icon name="Loader2" size={14} className="animate-spin mr-1" />}
                  Сохранить
                </Button>
              </>
            ) : (
              <>
                {selected?.is_active ? (
                  <Button
                    variant="outline"
                    onClick={() => setBlockDialog(true)}
                    disabled={saving}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    {saving
                      ? <Icon name="Loader2" size={14} className="animate-spin mr-1" />
                      : <Icon name="Ban" size={14} className="mr-1.5" />}
                    Заблокировать
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={unblockUser}
                    disabled={saving}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                  >
                    {saving
                      ? <Icon name="Loader2" size={14} className="animate-spin mr-1" />
                      : <Icon name="CheckCircle" size={14} className="mr-1.5" />}
                    Разблокировать
                  </Button>
                )}
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Icon name="Pencil" size={14} className="mr-1.5" />
                  Редактировать
                </Button>
                {selected?.email?.endsWith("@vk.local") && selected.is_active && (
                  <Button
                    variant="outline"
                    onClick={() => setMergeHint({
                      source_user_id: selected.id,
                      target_user_id: 0,
                      target_email_masked: "",
                      target_name: selected.name,
                      reason: "name_match",
                    })}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 gap-1.5"
                    title="Этот аккаунт создан при входе через ВКонтакте без email. Объединить с основным аккаунтом."
                  >
                    <Icon name="GitMerge" size={14} />
                    Объединить
                  </Button>
                )}
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={blockDialog} onOpenChange={setBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Заблокировать пользователя</AlertDialogTitle>
            <AlertDialogDescription>
              Выберите причину блокировки. При бане пользователь не сможет зарегистрироваться повторно с тем же email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => blockUser("duplicate")}
              className="text-yellow-600 hover:bg-yellow-50 border-yellow-300"
            >
              <Icon name="Copy" size={14} className="mr-1.5" />
              Дубликат
            </Button>
            <Button
              variant="destructive"
              onClick={() => blockUser("banned")}
            >
              <Icon name="Ban" size={14} className="mr-1.5" />
              Бан (нарушение)
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Окно объединения аккаунтов для vk.local дублей */}
      {mergeHint && mergeHint.target_user_id !== 0 && (
        <MergeAccountModal
          open
          hint={mergeHint}
          onMerged={() => { setMergeHint(null); closeDialog(); loadUsers(); }}
          onSkip={() => setMergeHint(null)}
        />
      )}
      {mergeHint && mergeHint.target_user_id === 0 && (
        <AdminMergeFromUserDialog
          open
          sourceId={mergeHint.source_user_id}
          sourceName={mergeHint.target_name}
          onDone={() => { setMergeHint(null); closeDialog(); loadUsers(); }}
          onClose={() => setMergeHint(null)}
        />
      )}
    </div>
  );
}