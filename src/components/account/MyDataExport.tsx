import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { userProfileApi } from "@/lib/user-api";
import { toast } from "sonner";

export default function MyDataExport() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  const handleExport = async () => {
    setLoading(true);
    try {
      const result = await userProfileApi.exportMyData();
      setData(result.data);
      toast.success("Данные загружены");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка экспорта данных");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const profile = data?.profile as Record<string, unknown> | undefined;
  const signups = (data?.signups || []) as Record<string, unknown>[];
  const roles = (data?.roles || []) as Record<string, unknown>[];
  const auditLog = (data?.audit_log || []) as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Icon name="Database" size={20} />
            Мои персональные данные
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Вы можете запросить все ваши персональные данные, которые хранятся в системе.
            Данные будут доступны для просмотра и скачивания в формате JSON.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleExport} disabled={loading}>
              {loading ? (
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
              ) : (
                <Icon name="Download" size={16} className="mr-2" />
              )}
              Запросить данные
            </Button>
            {data && (
              <Button variant="outline" onClick={handleDownload}>
                <Icon name="FileDown" size={16} className="mr-2" />
                Скачать JSON
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Профиль</CardTitle>
            </CardHeader>
            <CardContent>
              {profile ? (
                <div className="space-y-2 text-sm">
                  {Object.entries(profile).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-mono text-xs max-w-[60%] text-right truncate">
                        {value === null ? "—" : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Нет данных</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Участие в событиях ({signups.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {signups.length > 0 ? (
                <div className="space-y-2">
                  {signups.map((s, i) => (
                    <div key={i} className="text-sm py-2 border-b border-border last:border-0">
                      <div className="font-medium">{String(s.event_title || "Событие")}</div>
                      <div className="text-muted-foreground text-xs">
                        {String(s.event_date || "")} — {String(s.status || "")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Событий пока не было</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Роли ({roles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {roles.length > 0 ? (
                <div className="space-y-1">
                  {roles.map((r, i) => (
                    <div key={i} className="text-sm flex justify-between py-1">
                      <span>{String(r.role_name)}</span>
                      <span className="text-muted-foreground">{String(r.status)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Нет ролей</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Журнал действий (последние {auditLog.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLog.length > 0 ? (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {auditLog.map((a, i) => (
                    <div key={i} className="text-xs flex justify-between py-1 border-b border-border last:border-0">
                      <span className="font-mono">{String(a.action)}</span>
                      <div className="text-right text-muted-foreground">
                        <div>{String(a.ip_address || "")}</div>
                        <div>{String(a.created_at || "").slice(0, 16)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">История действий пуста</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}