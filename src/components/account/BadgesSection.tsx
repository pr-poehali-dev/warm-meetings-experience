import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { rolesApi, Badge } from "@/lib/roles-api";
import { toast } from "sonner";

export default function BadgesSection() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rolesApi
      .getBadges()
      .then((data) => setBadges(data.badges))
      .catch(() => toast.error("Не удалось загрузить бейджи"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-8 flex justify-center">
          <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const earned = badges.filter((b) => b.earned_at);
  const locked = badges.filter((b) => !b.earned_at);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          Достижения
          <span className="text-sm font-normal text-muted-foreground">
            {earned.length}/{badges.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`relative flex flex-col items-center text-center p-4 rounded-xl border transition-all ${
                badge.earned_at
                  ? "bg-primary/5 border-primary/20"
                  : "bg-muted/30 border-transparent opacity-50"
              }`}
            >
              <span className={`text-3xl mb-2 ${!badge.earned_at ? "grayscale" : ""}`}>
                {badge.icon}
              </span>
              <div className="text-xs font-semibold leading-tight">{badge.name}</div>
              <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                {badge.description}
              </div>
              {badge.earned_at && (
                <div className="text-[10px] text-primary mt-1.5 font-medium">
                  {new Date(badge.earned_at).toLocaleDateString("ru-RU")}
                </div>
              )}
              {!badge.earned_at && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl opacity-30">🔒</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
