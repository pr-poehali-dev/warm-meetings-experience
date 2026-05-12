/**
 * Редактор параметров «в складчину» в форме события.
 * Целевая сумма + порог + клубный взнос + комиссия + окно фиксации.
 * Показывает предпросмотр таблицы цен.
 */
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { OrgEvent } from "@/lib/organizer-api";

interface Props {
  fd: Partial<OrgEvent>;
  set: (patch: Partial<OrgEvent>) => void;
}

const roundUpTo50 = (n: number): number => Math.ceil(n / 50) * 50;

export default function CrowdfundEditor({ fd, set }: Props) {
  const target = Number(fd.cf_target_amount || 0);
  const extra = Number(fd.cf_extra_costs || 0);
  const min = Number(fd.cf_min_participants || 0);
  const max = Number(fd.cf_max_participants || fd.total_spots || 0);
  const commission = Number(fd.cf_commission_percent ?? 15);
  const feeMode = fd.cf_fee_mode || "fixed";
  const feeFixed = Number(fd.cf_club_fee || 0);
  const feePercent = Number(fd.cf_fee_percent || 0);

  const totalToCollect = target + extra;

  const calcPrice = (n: number): number => {
    if (!n || n <= 0 || !totalToCollect) return 0;
    const base = totalToCollect / n;
    return Math.round(base * (1 + commission / 100));
  };

  const maxPrice = calcPrice(min || 1);
  const clubFee =
    feeMode === "percent"
      ? roundUpTo50((maxPrice * feePercent) / 100)
      : feeFixed;

  const previewRows: number[] = [];
  if (min && max && min <= max) {
    previewRows.push(min);
    const mid = Math.round((min + max) / 2);
    if (mid !== min && mid !== max) previewRows.push(mid);
    previewRows.push(max);
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-md p-2 flex gap-2">
        <Icon name="Info" size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          Гости платят <b>клубный взнос</b> при записи. За {fd.cf_freeze_hours || 48}ч до события цена
          фиксируется и каждый доплачивает разницу. Если порог не набран — событие отменяется,
          взнос возвращается.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Целевая сумма сбора, ₽</label>
          <Input
            type="number"
            value={fd.cf_target_amount ?? ""}
            onChange={(e) => set({ cf_target_amount: parseInt(e.target.value) || 0 })}
            placeholder="12000"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Доп. расходы (мастер и т.п.), ₽</label>
          <Input
            type="number"
            value={fd.cf_extra_costs ?? ""}
            onChange={(e) => set({ cf_extra_costs: parseInt(e.target.value) || 0 })}
            placeholder="0"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Минимум участников (порог)</label>
          <Input
            type="number"
            value={fd.cf_min_participants ?? ""}
            onChange={(e) => set({ cf_min_participants: parseInt(e.target.value) || 0 })}
            placeholder="6"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Максимум участников</label>
          <Input
            type="number"
            value={fd.cf_max_participants ?? ""}
            onChange={(e) => set({ cf_max_participants: parseInt(e.target.value) || 0 })}
            placeholder="12"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Комиссия платформы, %</label>
          <Input
            type="number"
            step="0.5"
            value={fd.cf_commission_percent ?? 15}
            onChange={(e) => set({ cf_commission_percent: parseFloat(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Стоп-сбор за, часов</label>
          <Input
            type="number"
            value={fd.cf_freeze_hours ?? 48}
            onChange={(e) => set({ cf_freeze_hours: parseInt(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="text-xs font-semibold">Клубный взнос (списывается при записи)</div>
        <div className="flex gap-2">
          {[
            { v: "fixed", label: "Фикс. сумма" },
            { v: "percent", label: "% от макс. цены" },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => set({ cf_fee_mode: opt.v as "fixed" | "percent" })}
              className={`flex-1 py-1.5 px-2 rounded border text-xs font-medium transition-colors ${
                feeMode === opt.v
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {feeMode === "fixed" ? (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Сумма взноса, ₽ (мин. 100)</label>
            <Input
              type="number"
              min={100}
              value={fd.cf_club_fee ?? 500}
              onChange={(e) => set({ cf_club_fee: Math.max(100, parseInt(e.target.value) || 100) })}
              className="h-8 text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Процент от макс. цены</label>
            <Input
              type="number"
              step="1"
              value={fd.cf_fee_percent ?? 20}
              onChange={(e) => set({ cf_fee_percent: parseFloat(e.target.value) || 0 })}
              className="h-8 text-sm"
            />
            <div className="text-[11px] text-muted-foreground mt-1">
              ≈ {clubFee.toLocaleString("ru-RU")} ₽ (округление вверх до 50 ₽)
            </div>
          </div>
        )}
      </div>

      {previewRows.length > 0 && totalToCollect > 0 && (
        <div className="border-t pt-3">
          <div className="text-xs font-semibold mb-2 flex items-center gap-1">
            <Icon name="Calculator" size={12} />
            Предпросмотр цен (с комиссией {commission}%)
          </div>
          <div className="rounded-lg border bg-background overflow-hidden">
            <div className="grid grid-cols-3 text-[11px] font-semibold bg-muted/50 px-3 py-1.5">
              <div>Участников</div>
              <div className="text-right">Цена с чел.</div>
              <div className="text-right">Собрано всего</div>
            </div>
            {previewRows.map((n) => (
              <div key={n} className="grid grid-cols-3 text-xs px-3 py-1.5 border-t">
                <div>{n}</div>
                <div className="text-right font-semibold text-accent">
                  {calcPrice(n).toLocaleString("ru-RU")} ₽
                </div>
                <div className="text-right text-muted-foreground">
                  {(calcPrice(n) * n).toLocaleString("ru-RU")} ₽
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            Клубный взнос сейчас: <b>{clubFee.toLocaleString("ru-RU")} ₽</b> · доплата после фиксации:
            от <b>{Math.max(0, calcPrice(max || min) - clubFee).toLocaleString("ru-RU")} ₽</b> до{" "}
            <b>{Math.max(0, maxPrice - clubFee).toLocaleString("ru-RU")} ₽</b>
          </div>
        </div>
      )}
    </div>
  );
}