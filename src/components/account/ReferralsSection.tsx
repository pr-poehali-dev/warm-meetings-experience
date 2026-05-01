import { useEffect, useState } from "react";
import { userProfileApi, ReferralInvite } from "@/lib/user-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";

export default function ReferralsSection() {
  const [referralCode, setReferralCode] = useState("");
  const [invited, setInvited] = useState<ReferralInvite[]>([]);
  const [totalInvited, setTotalInvited] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    userProfileApi.getReferrals()
      .then((d) => {
        setReferralCode(d.referral_code);
        setInvited(d.invited);
        setTotalInvited(d.total_invited);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : "";

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      toast({ title: "Скопировано", description: "Ссылка скопирована в буфер обмена" });
    });
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Загрузка...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Реферальная ссылка */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icon name="Users" size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Пригласите друзей</p>
              <p className="text-xs text-muted-foreground">Делитесь ссылкой — они получат бонус при регистрации</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2.5">
            <Icon name="Link" size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-foreground font-mono flex-1 min-w-0 truncate">{referralLink}</span>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="flex-1" onClick={handleCopy}>
              <Icon name="Copy" size={14} className="mr-1.5" />
              Скопировать ссылку
            </Button>
            {typeof navigator !== "undefined" && navigator.share && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.share({ title: "СПАРКОМ", url: referralLink })}
              >
                <Icon name="Share2" size={14} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{totalInvited}</div>
            <div className="text-xs text-muted-foreground mt-1">Приглашено</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-violet-600">{invited.filter((r) => r.bonus_paid).length}</div>
            <div className="text-xs text-muted-foreground mt-1">Бонусов получено</div>
          </CardContent>
        </Card>
      </div>

      {/* Список приглашённых */}
      {invited.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Приглашённые</h3>
            <div className="space-y-2">
              {invited.map((person, idx) => (
                <div key={idx} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="User" size={13} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(person.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  {person.bonus_paid && (
                    <div className="flex items-center gap-1 text-xs text-violet-600 bg-violet-50 rounded-full px-2 py-0.5 flex-shrink-0">
                      <Icon name="Gift" size={11} />
                      Бонус
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="p-4 flex items-center gap-3">
          <Icon name="Info" size={16} className="text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">Бонусная программа для рефералов будет запущена в ближайшее время.</p>
        </CardContent>
      </Card>
    </div>
  );
}
