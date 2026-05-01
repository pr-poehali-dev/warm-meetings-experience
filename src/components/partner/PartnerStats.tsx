import { useEffect, useState } from "react";
import { partnerApi, PartnerStats as StatsType } from "@/lib/partner-api";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

export default function PartnerStats() {
  const [stats, setStats] = useState<StatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    partnerApi.getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="h-8 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const items = [
    { label: "Всего бань", value: stats.counts.total, icon: "Building2", color: "text-primary", bg: "bg-primary/10" },
    { label: "Активных", value: stats.counts.active, icon: "CheckCircle", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Просмотры за 7 дн.", value: stats.views.views_7d, icon: "Eye", color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Просмотры за 30 дн.", value: stats.views.views_30d, icon: "TrendingUp", color: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <Card key={item.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center mb-2`}>
                <Icon name={item.icon} size={16} className={item.color} />
              </div>
              <div className="text-2xl font-bold text-foreground">{item.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Мини-график по дням */}
      {stats.views_by_day.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Просмотры за 14 дней
            </h3>
            <ViewsChart data={stats.views_by_day} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ViewsChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
          <div
            className="w-full bg-primary/20 group-hover:bg-primary/40 rounded-sm transition-colors"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }}
            title={`${d.day}: ${d.count}`}
          />
          <span className="text-[9px] text-muted-foreground hidden sm:block">
            {new Date(d.day).getDate()}
          </span>
        </div>
      ))}
    </div>
  );
}
