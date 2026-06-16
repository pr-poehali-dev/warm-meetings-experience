import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { hubApi, Stats } from "./hubApi";

const CHANNEL_LABELS: Record<string, string> = {
  telegram: "Telegram",
  email: "Email",
  vk: "ВКонтакте",
  push: "Push",
  sms: "SMS",
  max: "MAX",
};

export default function HubStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    hubApi
      .stats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
      </div>
    );

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!stats) return null;

  const { totals, delivery_rate, by_channel, by_event } = stats;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="Send" label="Всего отправлено" value={totals.total} tone="slate" />
        <StatCard icon="CheckCircle2" label="Доставлено" value={totals.success} tone="green" />
        <StatCard icon="XCircle" label="Ошибок" value={totals.failed} tone="red" />
        <StatCard icon="TrendingUp" label="Доставляемость" value={`${delivery_rate}%`} tone="blue" />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">По каналам</h3>
          {Object.keys(by_channel).length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет отправок</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(by_channel).map(([ch, v]) => {
                const rate = v.total ? Math.round((100 * v.success) / v.total) : 0;
                return (
                  <div key={ch} className="flex items-center gap-3">
                    <span className="w-24 text-sm font-medium">
                      {CHANNEL_LABELS[ch] || ch}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-32 text-right">
                      {v.success}/{v.total} ({rate}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Топ типов уведомлений</h3>
          {by_event.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет данных</p>
          ) : (
            <div className="space-y-1.5">
              {by_event.map((e) => (
                <div key={e.event_type} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{e.event_type}</span>
                  <span className="font-medium">{e.cnt}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: number | string;
  tone: "slate" | "green" | "red" | "blue";
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-500 bg-slate-50",
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
    blue: "text-blue-600 bg-blue-50",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`inline-flex p-2 rounded-lg mb-2 ${tones[tone]}`}>
          <Icon name={icon} size={18} />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
