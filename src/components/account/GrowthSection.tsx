import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { rolesApi, UserRole, RoleApplication, Role } from "@/lib/roles-api";
import { toast } from "sonner";
import RoleApplicationDialog from "./RoleApplicationDialog";

interface GrowthSectionProps {
  rolesOnly?: boolean;
}

export default function GrowthSection({ rolesOnly = false }: GrowthSectionProps) {
  const [myRoles, setMyRoles] = useState<UserRole[]>([]);
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyRole, setApplyRole] = useState<Role | null>(null);
  const [tfaContinueRole, setTfaContinueRole] = useState<Role | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rolesData, allRolesData] = await Promise.all([
        rolesApi.getMyRoles(),
        rolesApi.getAllRoles(),
      ]);
      setMyRoles(rolesData.roles);
      setApplications(rolesData.applications);
      setAllRoles(allRolesData.roles);
    } catch {
      toast.error("Не удалось загрузить данные о ролях");
    } finally {
      setLoading(false);
    }
  };

  const activeRoleSlugs = myRoles.filter((r) => r.status === "active").map((r) => r.slug);
  const pendingAppSlugs = applications
    .filter((a) => a.status === "pending" || a.status === "pending_2fa")
    .map((a) => a.role_slug);

  const handleContinueTfa = (roleSlug: string) => {
    const role = allRoles.find((r) => r.slug === roleSlug);
    if (role) setTfaContinueRole(role);
  };

  const ROLE_NAME_OVERRIDES: Record<string, string> = {
    partner: "Управляющий",
  };
  const ROLE_DESCRIPTION_OVERRIDES: Record<string, string> = {
    partner: "Управляет карточкой бани, обновляет условия и расписание",
  };
  const HIDDEN_ROLE_SLUGS = ["owner"];

  const availableRoles = allRoles
    .filter((r) => !activeRoleSlugs.includes(r.slug) && r.slug !== "member" && !HIDDEN_ROLE_SLUGS.includes(r.slug))
    .map((r) => ({
      ...r,
      name: ROLE_NAME_OVERRIDES[r.slug] ?? r.name,
      description: ROLE_DESCRIPTION_OVERRIDES[r.slug] ?? r.description,
    }));

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-8 flex justify-center">
          <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (rolesOnly) {
    return (
      <>
        <p className="text-sm text-muted-foreground mb-4">
          Выберите специализацию, чтобы продолжить — нажмите на карточку и подайте заявку
        </p>
        <div className="space-y-3">
          {availableRoles.length === 0 && !loading && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Все доступные специализации уже получены
            </div>
          )}
          {availableRoles.map((role) => {
            const hasPendingApp = pendingAppSlugs.includes(role.slug);
            return (
              <div
                key={role.slug}
                onClick={() => !hasPendingApp && setApplyRole(role)}
                className={`flex items-center justify-between border rounded-2xl px-4 py-4 bg-card transition-all gap-3 ${
                  hasPendingApp
                    ? "opacity-70 cursor-default border-amber-200"
                    : "cursor-pointer hover:border-primary hover:shadow-sm active:scale-[0.99]"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-3xl flex-shrink-0">{role.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-base">{role.name}</div>
                    <div className="text-sm text-muted-foreground mt-0.5 leading-snug">{role.description}</div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {hasPendingApp ? (
                    <span className="text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-full font-medium whitespace-nowrap block">
                      На рассмотрении
                    </span>
                  ) : (
                    <Icon name="ChevronRight" size={18} className="text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {applications.length > 0 && (
          <div className="space-y-3 mt-6">
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Мои заявки
            </div>
            {applications.map((app) => (
              <div key={app.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span>{app.role_icon}</span>
                  <div>
                    <div className="text-sm font-medium">{app.role_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(app.created_at).toLocaleDateString("ru-RU")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {app.status === "pending_2fa" && (
                    <Button size="sm" variant="outline" onClick={() => handleContinueTfa(app.role_slug)}>
                      Подтвердить
                    </Button>
                  )}
                  <ApplicationStatus status={app.status} comment={app.admin_comment} />
                </div>
              </div>
            ))}
          </div>
        )}

        {applyRole && (
          <RoleApplicationDialog
            role={applyRole}
            onClose={() => setApplyRole(null)}
            onSuccess={() => { setApplyRole(null); loadData(); }}
          />
        )}
        {tfaContinueRole && (
          <RoleApplicationDialog
            role={tfaContinueRole}
            onClose={() => setTfaContinueRole(null)}
            onSuccess={() => { setTfaContinueRole(null); loadData(); }}
            initialTfaState={{
              applicationId: applications.find(
                (a) => a.role_slug === tfaContinueRole.slug && a.status === "pending_2fa"
              )!.id,
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <span>Мои роли</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {myRoles
              .filter((r) => r.status === "active")
              .map((role) => (
                <div
                  key={role.slug}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-full"
                >
                  <span>{role.icon}</span>
                  <span className="text-sm font-medium">{role.name}</span>
                  <span className="text-xs text-green-600">Активна</span>
                </div>
              ))}
          </div>

          {applications.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Мои заявки
              </div>
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between border rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span>{app.role_icon}</span>
                    <div>
                      <div className="text-sm font-medium">{app.role_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.status === "pending_2fa" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleContinueTfa(app.role_slug)}
                      >
                        Подтвердить
                      </Button>
                    )}
                    <ApplicationStatus status={app.status} comment={app.admin_comment} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {applyRole && (
        <RoleApplicationDialog
          role={applyRole}
          onClose={() => setApplyRole(null)}
          onSuccess={() => {
            setApplyRole(null);
            loadData();
          }}
        />
      )}

      {tfaContinueRole && (
        <RoleApplicationDialog
          role={tfaContinueRole}
          onClose={() => setTfaContinueRole(null)}
          onSuccess={() => {
            setTfaContinueRole(null);
            loadData();
          }}
          initialTfaState={{
            applicationId: applications.find(
              (a) => a.role_slug === tfaContinueRole.slug && a.status === "pending_2fa"
            )!.id,
          }}
        />
      )}
    </>
  );
}

function ApplicationStatus({ status, comment }: { status: string; comment: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    pending_2fa: { label: "Требуется подтверждение", className: "bg-blue-50 text-blue-700" },
    pending: { label: "На рассмотрении", className: "bg-amber-50 text-amber-700" },
    approved: { label: "Одобрена", className: "bg-green-50 text-green-700" },
    rejected: { label: "Отклонена", className: "bg-red-50 text-red-700" },
  };
  const badge = map[status] || { label: status, className: "bg-gray-50 text-gray-700" };

  return (
    <div className="text-right">
      <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${badge.className}`}>
        {badge.label}
      </span>
      {comment && status === "rejected" && (
        <div className="text-xs text-muted-foreground mt-1 max-w-[200px]">{comment}</div>
      )}
    </div>
  );
}