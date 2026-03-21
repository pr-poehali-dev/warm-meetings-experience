import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/ui/icon";
import { rolesApi, RoleProgress, UserRole, RoleApplication } from "@/lib/roles-api";
import { toast } from "sonner";
import RoleApplicationDialog from "./RoleApplicationDialog";

export default function GrowthSection() {
  const [myRoles, setMyRoles] = useState<UserRole[]>([]);
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [progress, setProgress] = useState<RoleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyRole, setApplyRole] = useState<RoleProgress | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rolesData, progressData] = await Promise.all([
        rolesApi.getMyRoles(),
        rolesApi.getProgress(),
      ]);
      setMyRoles(rolesData.roles);
      setApplications(rolesData.applications);
      setProgress(progressData.progress);
    } catch {
      toast.error("Не удалось загрузить данные о ролях");
    } finally {
      setLoading(false);
    }
  };

  const activeRoleSlugs = myRoles.filter((r) => r.status === "active").map((r) => r.slug);
  const pendingAppSlugs = applications.filter((a) => a.status === "pending").map((a) => a.role_slug);

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
            <span>Мой рост в сообществе</span>
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

          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Доступные пути развития
          </div>

          <div className="space-y-4">
            {progress.map((roleProgress) => {
              const isActive = activeRoleSlugs.includes(roleProgress.role_slug);
              const hasPendingApp = pendingAppSlugs.includes(roleProgress.role_slug);
              const percent = roleProgress.total > 0
                ? Math.round((roleProgress.completed / roleProgress.total) * 100)
                : 0;
              const allDone = roleProgress.completed === roleProgress.total;

              if (isActive) return null;

              return (
                <div
                  key={roleProgress.role_slug}
                  className="border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{roleProgress.role_icon}</span>
                      <div>
                        <div className="font-semibold">{roleProgress.role_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {roleProgress.completed}/{roleProgress.total} выполнено
                        </div>
                      </div>
                    </div>
                    {hasPendingApp ? (
                      <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-medium">
                        Заявка на рассмотрении
                      </span>
                    ) : allDone ? (
                      <Button size="sm" onClick={() => setApplyRole(roleProgress)}>
                        Подать заявку
                      </Button>
                    ) : (
                      <span className="text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-full">
                        {percent}%
                      </span>
                    )}
                  </div>

                  <Progress value={percent} className="h-2" />

                  <div className="space-y-2">
                    {roleProgress.requirements.map((req) => (
                      <div key={req.id} className="flex items-start gap-2.5 text-sm">
                        {req.completed ? (
                          <span className="text-green-500 mt-0.5 flex-shrink-0">✅</span>
                        ) : (
                          <span className="text-muted-foreground mt-0.5 flex-shrink-0">⏳</span>
                        )}
                        <div className="flex-1">
                          <span className={req.completed ? "text-muted-foreground line-through" : ""}>
                            {req.description}
                          </span>
                          {!req.completed && req.required_value > 1 && (
                            <span className="text-muted-foreground ml-1">
                              ({req.progress}/{req.required_value})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
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
                  <ApplicationStatus status={app.status} comment={app.admin_comment} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {applyRole && (
        <RoleApplicationDialog
          roleProgress={applyRole}
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
