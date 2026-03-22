import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

const ADMIN_USERS_API = "https://functions.poehali.dev/3048e78f-8bfe-4300-b910-2752590fa3ab";

interface UserRole {
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
  roles: UserRole[];
}

function getAdminToken(): string {
  return localStorage.getItem("admin_token") || "";
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      const res = await fetch(`${ADMIN_USERS_API}?${params}`, {
        headers: { "X-Admin-Token": getAdminToken() },
      });
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Не удалось загрузить пользователей");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const toggleActive = async (user: User) => {
    setToggling(user.id);
    try {
      const res = await fetch(ADMIN_USERS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": getAdminToken(),
        },
        body: JSON.stringify({ action: "toggle_active", user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: data.is_active } : u))
      );
      toast.success(data.is_active ? "Пользователь активирован" : "Пользователь заблокирован");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setToggling(null);
    }
  };

  const totalPages = Math.ceil(total / 20);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

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
                    <th className="pb-3 pr-4 font-medium">Telegram</th>
                    <th className="pb-3 pr-4 font-medium">Роли</th>
                    <th className="pb-3 pr-4 font-medium">Дата регистрации</th>
                    <th className="pb-3 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 text-gray-400">#{user.id}</td>
                      <td className="py-3 pr-4 font-medium text-gray-900">{user.name}</td>
                      <td className="py-3 pr-4 text-gray-600">{user.email}</td>
                      <td className="py-3 pr-4 text-gray-600">{user.phone || "—"}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        {user.telegram ? (
                          <a
                            href={`https://t.me/${user.telegram.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {user.telegram}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge key={role.slug} variant="secondary" className="text-xs">
                                {role.icon} {role.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">Нет ролей</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(user.created_at)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={user.is_active ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {user.is_active ? "Активен" : "Заблокирован"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(user)}
                            disabled={toggling === user.id}
                            className="h-7 px-2 text-xs"
                          >
                            {toggling === user.id ? (
                              <Icon name="Loader" size={12} className="animate-spin" />
                            ) : user.is_active ? (
                              <Icon name="Ban" size={12} />
                            ) : (
                              <Icon name="CheckCircle" size={12} />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Страница {page} из {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Icon name="ChevronLeft" size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <Icon name="ChevronRight" size={16} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
