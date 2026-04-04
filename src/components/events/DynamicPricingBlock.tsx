import { useEffect, useState } from "react";
import { PricingTier } from "@/lib/organizer-api";
import Icon from "@/components/ui/icon";

interface Props {
  tiers: PricingTier[];
}

function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(23, 59, 59, 999);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getActiveTier(tiers: PricingTier[]): { tier: PricingTier; index: number } | null {
  const today = new Date().toISOString().split("T")[0];
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (!t.valid_until || t.valid_until >= today) {
      return { tier: t, index: i };
    }
  }
  return null;
}

export default function DynamicPricingBlock({ tiers }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!tiers || tiers.length === 0) return null;

  const active = getActiveTier(tiers);
  if (!active) return null;

  const { tier, index } = active;
  const daysLeft = tier.valid_until ? getDaysUntil(tier.valid_until) : null;
  const isLast = index === tiers.length - 1;
  const nextTier = !isLast ? tiers[index + 1] : null;

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
          {tier.label}
        </div>
        <div className="text-3xl font-bold text-accent">
          {tier.price_amount.toLocaleString("ru-RU")} ₽
        </div>
      </div>

      {daysLeft !== null && daysLeft >= 0 && !isLast && (
        <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${daysLeft <= 3 ? "bg-red-50 text-red-700 border border-red-200" : daysLeft <= 7 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
          <Icon name="Clock" size={14} className="flex-shrink-0" />
          <span>
            {daysLeft === 0
              ? "Цена меняется сегодня"
              : daysLeft === 1
              ? "Цена меняется завтра"
              : `Цена вырастет через ${daysLeft} ${daysLeft < 5 ? "дня" : "дней"}`}
            {nextTier && (
              <span className="font-medium"> → {nextTier.price_amount.toLocaleString("ru-RU")} ₽</span>
            )}
          </span>
        </div>
      )}

      <div className="space-y-1.5 pt-1">
        {tiers.map((t, i) => {
          const isPast = t.valid_until ? t.valid_until < new Date().toISOString().split("T")[0] : false;
          const isCurrent = i === index;
          return (
            <div
              key={i}
              className={`flex items-center justify-between text-sm rounded-md px-2.5 py-1.5 ${isCurrent ? "bg-accent/10 font-medium text-accent" : isPast ? "text-muted-foreground line-through opacity-50" : "text-foreground"}`}
            >
              <span className="flex items-center gap-1.5">
                {isCurrent ? (
                  <Icon name="CheckCircle" size={13} className="text-accent" />
                ) : isPast ? (
                  <Icon name="Circle" size={13} />
                ) : (
                  <Icon name="Circle" size={13} className="text-muted-foreground" />
                )}
                {t.label}
                {t.valid_until && !isPast && !isCurrent && (
                  <span className="text-xs text-muted-foreground">до {new Date(t.valid_until).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span>
                )}
              </span>
              <span>{t.price_amount.toLocaleString("ru-RU")} ₽</span>
            </div>
          );
        })}
      </div>

      <div suppressHydrationWarning className="hidden">{now.toISOString()}</div>
    </div>
  );
}
