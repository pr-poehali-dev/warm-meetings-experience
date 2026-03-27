import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { rolesApi, UserRole, RoleApplication, Role } from "@/lib/roles-api";
import { toast } from "sonner";
import RoleApplicationDialog from "./RoleApplicationDialog";

export default function GrowthSection() {
  const [myRoles, setMyRoles] = useState<UserRole[]>([]);
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyRole, setApplyRole] = useState<Role | null>(null);

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
  const pendingAppSlugs = applications.filter((a) => a.status === "pending").map((a) => a.role_slug);

  const availableRoles = allRoles.filter(
    (r) => !activeRoleSlugs.includes(r.slug) && r.slug !== "member"
  );

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-8 flex justify-center">
          <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
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

          {availableRoles.length > 0 && (
            <>
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Доступные роли
              </div>

              <div className="space-y-3">
                {availableRoles.map((role) => {
                  const hasPendingApp = pendingAppSlugs.includes(role.slug);

                  return (
                    <div
                      key={role.slug}
                      className="flex items-center justify-between border rounded-xl px-4 py-3 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{role.icon}</span>
                        <div>
                          <div className="font-semibold">{role.name}</div>
                          <div className="text-sm text-muted-foreground">{role.description}</div>
                        </div>
                      </div>
                      {hasPendingApp ? (
                        <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-medium whitespace-nowrap">
                          На рассмотрении
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setApplyRole(role)}>
                          Подать заявку
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

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
                  <ApplicationStatus status={app.status} comment={app.admin_comment} />
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
    </>
  );
}

function ApplicationStatus({ status, comment }: { status: string; comment: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
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
