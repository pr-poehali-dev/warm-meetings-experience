import { useState } from "react";
import Icon from "@/components/ui/icon";
import { CalcParams, CalcResults, fmt } from "./calc-types";
import { Slider, EditableValue, Hint, CostSection } from "./CalcPrimitives";

interface CalcInputPanelProps {
  params: CalcParams;
  r: CalcResults;
  isLoss: boolean;
  isWarn: boolean;
  statusColor: string;
  set: (field: keyof CalcParams, value: unknown) => void;
  setParams: React.Dispatch<React.SetStateAction<CalcParams>>;
  addFixed: () => void;
  addVar: () => void;
  updFixed: (id: string, patch: { label?: string; amount?: number }) => void;
  updVar: (id: string, patch: { label?: string; amount?: number }) => void;
  removeFixed: (id: string) => void;
  removeVar: (id: string) => void;
}

export default function CalcInputPanel({
  params, r, isLoss, isWarn, statusColor,
  set, setParams, addFixed, addVar, updFixed, updVar, removeFixed, removeVar,
}: CalcInputPanelProps) {
  const [showCosts, setShowCosts] = useState(false);

  const priceMin = Math.max(100, Math.round(r.costPerPerson * 0.5));
  const priceMax = Math.max(priceMin + 2000, r.costPerPerson * 4);

  return (
    <div className="lg:col-span-2 space-y-4">

      {/* Блок: Параметры события */}
      <div className="rounded-2xl border bg-card p-4 space-y-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Параметры события</div>

        {/* Участники */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center">
              Участников
              <Hint text="Сколько человек вы ожидаете. Перемещайте ползунок — прибыль пересчитается мгновенно." />
            </span>
            <EditableValue
              value={params.participants}
              min={2} max={40}
              className="text-primary"
              onChange={(v) => set("participants", v)}
            />
          </div>
          <div className="pt-4">
            <Slider
              value={params.participants}
              min={2} max={40} step={1}
              onChange={(v) => set("participants", v)}
              colorClass="bg-primary"
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>2</span><span>10</span><span>20</span><span>30</span><span>40</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Цена */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center">
              Цена билета
              <Hint text="Сколько платит каждый гость. Ориентир: цена должна быть выше себестоимости + комиссия + ваша прибыль." />
            </span>
            <div className="flex items-center gap-1">
              {params.priceMode === "manual" ? (
                <EditableValue
                  value={params.guestPrice}
                  min={priceMin} max={priceMax}
                  suffix=" ₽"
                  style={{ color: statusColor }}
                  format={(v) => fmt(v)}
                  onChange={(v) => setParams((p) => ({ ...p, guestPrice: v, priceMode: "manual" }))}
                />
              ) : (
                <span className="text-2xl font-bold tabular-nums" style={{ color: statusColor }}>
                  {fmt(r.guestPrice)} ₽
                </span>
              )}
            </div>
          </div>

          {/* Переключатель режима */}
          <div className="flex gap-1 bg-muted rounded-lg p-1 text-xs">
            <button
              onClick={() => set("priceMode", "manual")}
              className={`flex-1 py-1.5 rounded-md font-medium transition-all ${params.priceMode === "manual" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            >
              Своя цена
            </button>
            <button
              onClick={() => set("priceMode", "markup")}
              className={`flex-1 py-1.5 rounded-md font-medium transition-all ${params.priceMode === "markup" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            >
              По наценке %
            </button>
          </div>

          {params.priceMode === "manual" ? (
            <div className="pt-4">
              <Slider
                value={params.guestPrice}
                min={priceMin}
                max={priceMax}
                step={50}
                onChange={(v) => setParams((p) => ({ ...p, guestPrice: v, priceMode: "manual" }))}
                colorClass={isLoss ? "bg-red-400" : isWarn ? "bg-amber-400" : "bg-green-500"}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-3">
                <span>{fmt(priceMin)} ₽</span>
                <span className="text-xs text-muted-foreground">себест: {fmt(r.costPerPerson)} ₽/чел</span>
                <span>{fmt(priceMax)} ₽</span>
              </div>
            </div>
          ) : (
            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Наценка:</span>
                <EditableValue
                  value={params.markup}
                  min={0} max={100}
                  suffix="%"
                  className="text-primary"
                  onChange={(v) => setParams((p) => ({ ...p, markup: v, priceMode: "markup" }))}
                />
              </div>
              <Slider
                value={params.markup}
                min={0} max={100} step={5}
                onChange={(v) => setParams((p) => ({ ...p, markup: v, priceMode: "markup" }))}
                colorClass="bg-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-3">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
              <div className="flex items-center justify-between bg-muted rounded-lg px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">Итоговая цена:</span>
                <span className="font-bold text-foreground">{fmt(r.guestPrice)} ₽</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Блок: Расходы (свёртываемый) */}
      <div className="rounded-2xl border bg-card">
        <button
          onClick={() => setShowCosts(!showCosts)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Расходы</div>
            <div className="text-sm font-medium mt-0.5">
              {fmt(r.fixedTotal)} ₽ постоянные + {fmt(r.varPerPerson)} ₽/чел переменные
            </div>
          </div>
          <Icon name={showCosts ? "ChevronUp" : "ChevronDown"} size={16} className="text-muted-foreground shrink-0" />
        </button>

        {showCosts && (
          <div className="px-4 pb-4 space-y-5 border-t pt-4">
            <CostSection
              title="Постоянные расходы"
              hint="Расходы, которые вы платите независимо от числа гостей: аренда, гонорар мастера, реклама."
              items={params.fixedItems}
              unit="₽"
              onAdd={addFixed}
              onChangeLabel={(id, v) => updFixed(id, { label: v })}
              onChangeAmount={(id, v) => updFixed(id, { amount: v })}
              onRemove={removeFixed}
              total={r.fixedTotal}
              totalLabel="Итого постоянные:"
            />
            <div className="h-px bg-border" />
            <CostSection
              title="Переменные расходы на гостя"
              hint="Расходы, которые растут вместе с числом гостей: чай, расходники, угощение."
              items={params.varItems}
              unit="₽/чел"
              onAdd={addVar}
              onChangeLabel={(id, v) => updVar(id, { label: v })}
              onChangeAmount={(id, v) => updVar(id, { amount: v })}
              onRemove={removeVar}
              total={r.varPerPerson}
              totalLabel="Итого на гостя:"
            />
            <div className="h-px bg-border" />
            {/* Комиссия и взнос */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Платформа</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm flex-1 flex items-center">
                    Комиссия платформы
                    <Hint text="Процент от выручки, который уходит платформе за каждое событие." />
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={params.platformCommission === 0 ? "" : String(params.platformCommission)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        set("platformCommission", raw === "" ? 0 : Math.min(100, parseInt(raw, 10)));
                      }}
                      placeholder="0"
                      className="w-14 h-7 text-sm text-center rounded-md border bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm flex-1 flex items-center">
                    Клубный взнос
                    <Hint text="Фиксированная сумма с каждого гостя в пользу платформы (членство в клубе)." />
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={params.clubFee === 0 ? "" : String(params.clubFee)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        set("clubFee", raw === "" ? 0 : parseInt(raw, 10));
                      }}
                      placeholder="0"
                      className="w-20 h-7 text-sm text-center rounded-md border bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-xs text-muted-foreground">₽/чел</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}