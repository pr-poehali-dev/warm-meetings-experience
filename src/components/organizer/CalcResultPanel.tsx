import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { CalcParams, CalcResults, fmt } from "./calc-types";
import { ChartTooltip } from "./CalcPrimitives";

interface CalcResultPanelProps {
  params: CalcParams;
  r: CalcResults;
  chartData: ReturnType<typeof import("./calc-types").buildChartData>;
  breakeven: number | null;
  isLoss: boolean;
  isWarn: boolean;
  statusColor: string;
  statusBg: string;
  statusText: string;
  recommendations: string[];
  onCreateEvent?: (params: CalcParams) => void;
}

export default function CalcResultPanel({
  params, r, chartData, breakeven, isLoss, isWarn,
  statusColor, statusBg, statusText, recommendations, onCreateEvent,
}: CalcResultPanelProps) {
  return (
    <div className="lg:col-span-3 space-y-4">

      {/* Карточка прибыли */}
      <div className={`rounded-2xl border-2 p-5 transition-all ${statusBg}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Ваша прибыль</div>
            <div className={`text-4xl font-bold tabular-nums transition-all ${statusText}`}>
              {isLoss ? "−" : "+"}{fmt(Math.abs(r.profit))} ₽
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              при {params.participants} участниках × {fmt(r.guestPrice)} ₽
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-xs text-muted-foreground">Наценка</div>
            <div className={`text-2xl font-bold ${statusText}`}>{r.markupPct > 0 ? r.markupPct.toFixed(0) : "—"}%</div>
          </div>
        </div>

        {/* Прогресс-бар до безубыточности */}
        {breakeven !== null && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 чел</span>
              <span className="font-medium">
                {params.participants >= breakeven
                  ? `✓ Безубыточность: ${breakeven} чел`
                  : `До безубыточности: ${breakeven} чел (ещё ${breakeven - params.participants})`}
              </span>
              <span>{Math.max(params.participants, breakeven) + 5} чел</span>
            </div>
            <div className="h-3 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (params.participants / breakeven) * 100)}%`,
                  backgroundColor: params.participants >= breakeven ? "#22c55e" : "#f59e0b"
                }}
              />
            </div>
          </div>
        )}
        {breakeven === null && (
          <div className="mt-3 text-xs text-red-600 font-medium">
            При текущей цене безубыточность недостижима
          </div>
        )}
      </div>

      {/* График */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold">График прибыли</div>
            <div className="text-xs text-muted-foreground">Зависимость от числа участников</div>
          </div>
          {breakeven && (
            <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium">
              Точка ноля: {breakeven} чел
            </div>
          )}
        </div>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={statusColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={statusColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="n" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} label={{ value: "участников", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}к` : v} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} strokeDasharray="4 2" />
              {breakeven && (
                <ReferenceLine x={breakeven} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 2" />
              )}
              <ReferenceLine x={params.participants} stroke={statusColor} strokeWidth={2} />
              <Area
                type="monotone"
                dataKey="profit"
                stroke={statusColor}
                strokeWidth={2.5}
                fill="url(#profitGrad)"
                dot={false}
                activeDot={{ r: 4, fill: statusColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-green-500" /> точка ноля</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5" style={{ backgroundColor: statusColor }} /> текущий прогноз</span>
        </div>
      </div>

      {/* Разбивка рублей */}
      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <div className="text-sm font-semibold mb-3">Куда уходят деньги</div>
        {(() => {
          const total = r.revenue;
          if (total <= 0) return null;
          const orgCosts = r.totalCosts;
          const platform = r.commission + r.clubTotal;
          const profit = Math.max(0, r.profit);
          const pctCosts = Math.round((orgCosts / total) * 100);
          const pctPlatform = Math.round((platform / total) * 100);
          const pctProfit = Math.max(0, 100 - pctCosts - pctPlatform);
          return (
            <div className="space-y-3">
              <div className="h-5 rounded-full overflow-hidden flex">
                <div className="bg-red-400 transition-all h-full" style={{ width: `${pctCosts}%` }} title={`Расходы: ${pctCosts}%`} />
                <div className="bg-amber-400 transition-all h-full" style={{ width: `${pctPlatform}%` }} title={`Платформа: ${pctPlatform}%`} />
                <div className="bg-green-400 transition-all h-full" style={{ width: `${pctProfit}%` }} title={`Прибыль: ${pctProfit}%`} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />Расходы
                  </div>
                  <div className="font-bold text-sm mt-0.5">{fmt(orgCosts)} ₽</div>
                  <div className="text-muted-foreground">{pctCosts}%</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />Платформа
                  </div>
                  <div className="font-bold text-sm mt-0.5">{fmt(platform)} ₽</div>
                  <div className="text-muted-foreground">{pctPlatform}%</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />Вам
                  </div>
                  <div className={`font-bold text-sm mt-0.5 ${isLoss ? "text-red-600" : "text-green-600"}`}>{isLoss ? "−" : "+"}{fmt(Math.abs(r.profit))} ₽</div>
                  <div className="text-muted-foreground">{isLoss ? "убыток" : `${pctProfit}%`}</div>
                </div>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t">
                <span className="text-muted-foreground">Выручка всего:</span>
                <span className="font-semibold">{fmt(total)} ₽</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Рекомендации */}
      {recommendations.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <Icon name="Lightbulb" size={15} />
            Советы
          </div>
          <ul className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-amber-700 flex gap-2">
                <span className="shrink-0 mt-0.5">→</span>{rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onCreateEvent && (
        <Button className="w-full gap-2" onClick={() => onCreateEvent(params)}>
          <Icon name="Plus" size={16} />
          Создать событие на основе расчёта
        </Button>
      )}
    </div>
  );
}
