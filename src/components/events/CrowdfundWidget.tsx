/**
 * Виджет «Сбор в складчину» на карточке события.
 * Показывает текущую/целевую цены, прогресс участников, таймер до стоп-сбора и подсказку про взнос.
 */
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { CrowdfundInfo } from "@/lib/api";

interface Props {
  cf: CrowdfundInfo;
  className?: string;
}

const fmt = (n: number) => n.toLocaleString("ru-RU");

function useCountdown(target: string | null) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;
  const t = new Date(target).getTime();
  const diff = t - now;
  if (diff <= 0) return { done: true, d: 0, h: 0, m: 0 };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { done: false, d, h, m };
}

export default function CrowdfundWidget({ cf, className = "" }: Props) {
  const countdown = useCountdown(cf.freeze_at);
  const isCancelled = cf.status === "cancelled";
  const isConfirmed = cf.status === "confirmed" || cf.threshold_reached;
  const toMin = Math.max(0, (cf.min_participants || 0) - cf.current_count);
  const toMax = Math.max(0, (cf.max_participants || 0) - cf.current_count);

  return (
    <Card className={`border-orange-200 bg-gradient-to-br from-orange-50/80 to-amber-50/50 ${className}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
              <Icon name="Users" size={18} className="text-orange-700" />
            </div>
            <div>
              <div className="font-semibold text-sm">Сбор в складчину</div>
              <div className="text-[11px] text-muted-foreground">
                Чем больше нас — тем дешевле каждому
              </div>
            </div>
          </div>
          {isCancelled ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
              Отменено
            </span>
          ) : isConfirmed ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
              Состоится
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
              Идёт набор
            </span>
          )}
        </div>

        {/* Цены */}
        {cf.final_price ? (
          <div className="bg-white/70 rounded-xl p-3 border border-green-200">
            <div className="text-[11px] text-muted-foreground mb-0.5">Финальная цена</div>
            <div className="text-2xl font-bold text-green-700">{fmt(cf.final_price)} ₽/чел</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/70 rounded-xl p-3 border border-border">
              <div className="text-[11px] text-muted-foreground mb-0.5">Сейчас</div>
              <div className="text-xl font-bold text-foreground">
                {cf.price_current ? `${fmt(cf.price_current)} ₽` : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground">с человека</div>
            </div>
            <div className="bg-white/70 rounded-xl p-3 border border-border">
              <div className="text-[11px] text-muted-foreground mb-0.5">При полном наборе</div>
              <div className="text-xl font-bold text-accent">
                {cf.price_at_max ? `${fmt(cf.price_at_max)} ₽` : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {cf.max_participants} чел.
              </div>
            </div>
          </div>
        )}

        {/* Прогресс */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Участников: <b className="text-foreground">{cf.current_count}</b> из{" "}
              {cf.max_participants || "?"}
            </span>
            <span className="text-muted-foreground">{cf.progress_percent}%</span>
          </div>
          <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isConfirmed
                  ? "bg-gradient-to-r from-green-400 to-emerald-500"
                  : "bg-gradient-to-r from-orange-400 to-amber-500"
              }`}
              style={{ width: `${Math.min(100, cf.progress_percent)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            {!isConfirmed && cf.min_participants ? (
              <span className="text-amber-700">
                <Icon name="Target" size={11} className="inline mr-0.5" />
                До запуска: ещё <b>{toMin}</b>{" "}
                {toMin === 1 ? "участник" : toMin > 1 && toMin < 5 ? "участника" : "участников"}
              </span>
            ) : (
              <span className="text-green-700">
                <Icon name="Check" size={11} className="inline mr-0.5" />
                Порог достигнут
              </span>
            )}
            {!isConfirmed && toMax > 0 && (
              <span className="text-muted-foreground">До макс. скидки: {toMax}</span>
            )}
          </div>
        </div>

        {/* Таймер стоп-сбора */}
        {!isCancelled && countdown && !countdown.done && (
          <div className="bg-amber-100/60 border border-amber-200 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
            <Icon name="Clock" size={13} className="text-amber-700" />
            <span className="text-amber-900">
              Стоп-сбор через{" "}
              <b>
                {countdown.d > 0 && `${countdown.d} д `}
                {countdown.h} ч {countdown.m} мин
              </b>
              {" "}— после этого цена фиксируется и нужно будет доплатить разницу
            </span>
          </div>
        )}

        {/* Подсказка */}
        {!isCancelled && !cf.final_price && (
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            <Icon name="Info" size={11} className="inline mr-0.5 text-orange-600" />
            При записи списывается <b>клубный взнос {fmt(cf.club_fee)} ₽</b>. За{" "}
            {cf.topup_deadline_hours
              ? `${Math.round((new Date(cf.freeze_at || Date.now()).getTime() - Date.now()) / 3600000)}ч `
              : ""}
            до события цена фиксируется и каждый доплачивает разницу. Если порог не наберётся —
            взнос вернётся.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
