import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import ConsentPhotoBadge from "@/components/ui/ConsentPhotoBadge";
import { toast } from "sonner";

const ADMIN_USERS_API = "https://functions.poehali.dev/3048e78f-8bfe-4300-b910-2752590fa3ab";

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

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<AllRole[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  // Диалог
  const [selected, setSelected] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ name: string; phone: string; telegram: string }>({ name: "", phone: "", telegram: "" });
  const [saving, setSaving] = useState(false);

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

  const toggleActive = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const data = await adminPost({ action: "toggle_active", user_id: selected.id });
      syncSelected({ ...selected, is_active: data.is_active });
      toast.success(data.is_active ? "Пользователь активирован" : "Пользователь заблокирован");
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
              placeholder="Поиск по имени, email или телефону..."
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
                      <td className="py-3 pr-4 text-gray-600">{user.email}</td>
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
                        <Badge variant={user.is_active ? "default" : "destructive"} className="text-xs">
                          {user.is_active ? "Активен" : "Заблокирован"}
                        </Badge>
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

      {/* Диалог пользователя */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="User" size={18} />
              {selected?.name}
              <Badge variant={selected?.is_active ? "default" : "destructive"} className="text-xs ml-1">
                {selected?.is_active ? "Активен" : "Заблокирован"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

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
                    <Input value={draft.phone} placeholder="+7..." onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
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
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
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
                <Button
                  variant="outline"
                  onClick={toggleActive}
                  disabled={saving}
                  className={selected?.is_active ? "text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" : "text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"}
                >
                  {saving
                    ? <Icon name="Loader2" size={14} className="animate-spin mr-1" />
                    : <Icon name={selected?.is_active ? "Ban" : "CheckCircle"} size={14} className="mr-1.5" />}
                  {selected?.is_active ? "Заблокировать" : "Разблокировать"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Icon name="Pencil" size={14} className="mr-1.5" />
                  Редактировать
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}