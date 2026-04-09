import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

const ROLES_API = "https://functions.poehali.dev/ccd16473-f2d9-40af-a82e-4e348402aa29";

interface RoleApplication {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  role_name: string;
  role_slug: string;
  role_icon: string;
  status: string;
  message: string;
  admin_comment: string | null;
  created_at: string;
  reviewed_at: string | null;
  invite_event_id: number | null;
  invite_event_title: string | null;
}

interface UserWithRoles {
  id: number;
  name: string;
  email: string;
  roles: { name: string; slug: string; icon: string; status: string }[];
}

async function adminRequest(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function AdminRoles() {
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"applications" | "users">("applications");
  const [reviewComment, setReviewComment] = useState<Record<number, string>>({});
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token") || "";
      const data = await adminRequest(`${ROLES_API}/?resource=admin-applications`, {
        headers: { "X-Admin-Token": token },
      });
      setApplications(data.applications || []);
      setUsers(data.users || []);
    } catch {
      toast.error("Не удалось загрузить данные о ролях");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (appId: number, action: "approve" | "reject") => {
    setProcessing(appId);
    try {
      const token = localStorage.getItem("admin_token") || "";
      await adminRequest(`${ROLES_API}/?resource=admin-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: JSON.stringify({
          application_id: appId,
          action,
          comment: reviewComment[appId] || "",
        }),
      });
      toast.success(action === "approve" ? "Заявка одобрена" : "Заявка отклонена");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setProcessing(null);
    }
  };

  const handleGrantRole = async (userId: number, roleSlug: string) => {
    try {
      const token = localStorage.getItem("admin_token") || "";
      await adminRequest(`${ROLES_API}/?resource=admin-grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: JSON.stringify({ user_id: userId, role_slug: roleSlug }),
      });
      toast.success("Роль назначена");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const pendingApps = applications.filter((a) => a.status === "pending");
  const reviewedApps = applications.filter((a) => a.status !== "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Управление ролями</h2>
        <div className="flex gap-2">
          <Button
            variant={tab === "applications" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("applications")}
          >
            Заявки {pendingApps.length > 0 && `(${pendingApps.length})`}
          </Button>
          <Button
            variant={tab === "users" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("users")}
          >
            Пользователи
          </Button>
        </div>
      </div>

      {tab === "applications" && (
        <div className="space-y-4">
          {pendingApps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ожидают рассмотрения</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingApps.map((app) => (
                  <div key={app.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span>{app.role_icon}</span>
                          <span className="font-semibold">{app.role_name}</span>
                          {app.invite_event_id && (
                            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Icon name="Link" size={10} />
                              по инвайту
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {app.user_name} ({app.user_email})
                        </div>
                        {app.invite_event_id && (
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                            <Icon name="CalendarDays" size={13} className="text-gray-400" />
                            {app.invite_event_title || `Событие #${app.invite_event_id}`}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          {new Date(app.created_at).toLocaleDateString("ru-RU")}
                        </div>
                      </div>
                    </div>
                    {app.message && !app.invite_event_id && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm">{app.message}</div>
                    )}
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Комментарий (необязательно)"
                        value={reviewComment[app.id] || ""}
                        onChange={(e) =>
                          setReviewComment((prev) => ({ ...prev, [app.id]: e.target.value }))
                        }
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleReview(app.id, "approve")}
                          disabled={processing === app.id}
                        >
                          {processing === app.id ? (
                            <Icon name="Loader2" size={14} className="animate-spin mr-1" />
                          ) : null}
                          Одобрить
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(app.id, "reject")}
                          disabled={processing === app.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          Отклонить
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {pendingApps.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Нет заявок на рассмотрение
              </CardContent>
            </Card>
          )}

          {reviewedApps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">История</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reviewedApps.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span>{app.role_icon}</span>
                        <div>
                          <div className="text-sm font-medium">{app.user_name}</div>
                          <div className="text-xs text-gray-500">
                            {app.role_name}
                            {app.invite_event_title && ` · ${app.invite_event_title}`}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          app.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {app.status === "approved" ? "Одобрена" : "Отклонена"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "users" && (
        <Card>
          <CardContent className="py-4">
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Нет пользователей</div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <div className="font-medium text-sm">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                      <div className="flex gap-1 mt-1">
                        {u.roles.map((r) => (
                          <span
                            key={r.slug}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              r.status === "active"
                                ? "bg-primary/10 text-primary"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {r.icon} {r.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {["parmaster", "organizer", "partner", "admin"].map((slug) => {
                        const hasRole = u.roles.some((r) => r.slug === slug && r.status === "active");
                        if (hasRole) return null;
                        const names: Record<string, string> = {
                          parmaster: "🔥",
                          organizer: "📅",
                          partner: "🏠",
                          admin: "⚙️",
                        };
                        return (
                          <Button
                            key={slug}
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => handleGrantRole(u.id, slug)}
                            title={`Назначить роль ${slug}`}
                          >
                            +{names[slug]}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}