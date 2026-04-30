import { useState, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";

// ─── Типы ────────────────────────────────────────────────────────────────────

interface CostItem {
  id: string;
  label: string;
  amount: number;
}

export interface CalcParams {
  fixedItems: CostItem[];
  varItems: CostItem[];
  platformCommission: number;
  clubFee: number;
  participants: number;
  guestPrice: number;
  markup: number;
  priceMode: "manual" | "markup";
}

interface Template {
  id: string;
  name: string;
  params: CalcParams;
  createdAt: string;
}

interface Props {
  onCreateEvent?: (params: CalcParams) => void;
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 8);
const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
const STORAGE_KEY = "calc_templates_v2";

function loadTemplates(): Template[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveTemplates(t: Template[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); }

const defaultParams = (): CalcParams => ({
  fixedItems: [
    { id: uid(), label: "Аренда бани", amount: 9000 },
    { id: uid(), label: "Мастер", amount: 5000 },
    { id: uid(), label: "Реклама", amount: 1000 },
  ],
  varItems: [
    { id: uid(), label: "Чай и травы", amount: 100 },
    { id: uid(), label: "Расходники (простыни, тапочки)", amount: 50 },
  ],
  platformCommission: 10,
  clubFee: 100,
  participants: 10,
  guestPrice: 1800,
  markup: 20,
  priceMode: "manual",
});

// ─── Расчёты ─────────────────────────────────────────────────────────────────

function calcResults(p: CalcParams) {
  const fixedTotal = p.fixedItems.reduce((s, i) => s + i.amount, 0);
  const varPerPerson = p.varItems.reduce((s, i) => s + i.amount, 0);
  const costPerPerson = p.participants > 0 ? fixedTotal / p.participants + varPerPerson : 0;

  let guestPrice = p.guestPrice;
  if (p.priceMode === "markup") {
    guestPrice = Math.ceil((costPerPerson + p.clubFee) * (1 + p.markup / 100));
  }

  const revenue = guestPrice * p.participants;
  const commission = (revenue * p.platformCommission) / 100;
  const clubTotal = p.clubFee * p.participants;
  const totalCosts = fixedTotal + varPerPerson * p.participants;
  const profit = revenue - commission - clubTotal - totalCosts;
  const markupPct = costPerPerson > 0
    ? ((guestPrice - costPerPerson - p.clubFee) / costPerPerson) * 100 : 0;

  return { fixedTotal, varPerPerson, totalCosts, costPerPerson, guestPrice, revenue, commission, clubTotal, profit, markupPct };
}

function buildChartData(p: CalcParams) {
  const fixedTotal = p.fixedItems.reduce((s, i) => s + i.amount, 0);
  const varPerPerson = p.varItems.reduce((s, i) => s + i.amount, 0);
  const maxN = Math.max(20, p.participants + 6);
  const points = [];
  for (let n = 1; n <= maxN; n++) {
    const costPerPerson = n > 0 ? fixedTotal / n + varPerPerson : 0;
    let guestPrice = p.guestPrice;
    if (p.priceMode === "markup") {
      guestPrice = Math.ceil((costPerPerson + p.clubFee) * (1 + p.markup / 100));
    }
    const revenue = guestPrice * n;
    const commission = (revenue * p.platformCommission) / 100;
    const clubTotal = p.clubFee * n;
    const totalCosts = fixedTotal + varPerPerson * n;
    const profit = revenue - commission - clubTotal - totalCosts;
    points.push({ n, profit, revenue, costs: totalCosts + commission + clubTotal });
  }
  return points;
}

function findBreakeven(p: CalcParams): number | null {
  const data = buildChartData(p);
  for (const d of data) {
    if (d.profit >= 0) return d.n;
  }
  return null;
}

// ─── Ползунок ─────────────────────────────────────────────────────────────────

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  colorClass?: string;
  unit?: string;
}

function Slider({ value, min, max, step = 1, onChange, formatValue, colorClass = "bg-primary", unit }: SliderProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const pct = Math.round(((value - min) / (max - min)) * 100);

  const startEdit = () => {
    setInputVal(String(value));
    setEditing(true);
  };

  const commitEdit = () => {
    const raw = inputVal.replace(/[^0-9]/g, "");
    if (raw !== "") {
      const num = Math.min(max, Math.max(min, parseInt(raw, 10)));
      onChange(num);
    }
    setEditing(false);
  };

  return (
    <div className="relative" style={{ touchAction: "none" }}>
      {/* Метка над ползунком */}
      {formatValue && (
        <div className="relative h-7 mb-1">
          {!editing ? (
            <button
              type="button"
              onClick={startEdit}
              className="absolute z-10 text-xs font-semibold text-foreground whitespace-nowrap bg-muted hover:bg-muted/80 rounded px-1.5 py-0.5 cursor-pointer transition-colors"
              style={{
                left: `clamp(0px, calc(${pct}% - 20px), calc(100% - 44px))`,
              }}
            >
              {formatValue(value)}
            </button>
          ) : (
            <div
              className="absolute z-20"
              style={{ left: `clamp(0px, calc(${pct}% - 32px), calc(100% - 80px))` }}
            >
              <div className="flex items-center gap-1 bg-background border rounded-lg shadow-lg px-2 py-0.5">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={commitEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
                  className="w-16 text-xs font-semibold bg-transparent outline-none text-center"
                />
                {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Сам ползунок */}
      <div className="relative h-6 flex items-center">
        <div className="w-full h-2 rounded-full bg-muted relative">
          <div
            className={`absolute left-0 top-0 h-2 rounded-full ${colorClass} opacity-80`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ touchAction: "none" }}
        />
        <div
          className={`absolute w-5 h-5 rounded-full border-2 border-white shadow-md ${colorClass} pointer-events-none`}
          style={{ left: `calc(${pct}% - 10px)` }}
        />
      </div>
    </div>
  );
}

// ─── Tooltip для подсказок ────────────────────────────────────────────────────

function Hint({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-muted-foreground hover:text-primary transition-colors"
        type="button"
      >
        <Icon name="CircleHelp" size={13} />
      </button>
      {show && (
        <span className="absolute z-50 bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs rounded-lg px-3 py-2 w-52 leading-relaxed shadow-lg">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
        </span>
      )}
    </span>
  );
}

// ─── Секция расходов ──────────────────────────────────────────────────────────

interface CostSectionProps {
  title: string;
  hint: string;
  items: CostItem[];
  unit: string;
  onAdd: () => void;
  onChangeLabel: (id: string, v: string) => void;
  onChangeAmount: (id: string, v: number) => void;
  onRemove: (id: string) => void;
  total: number;
  totalLabel: string;
}

function CostSection({ title, hint, items, unit, onAdd, onChangeLabel, onChangeAmount, onRemove, total, totalLabel }: CostSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground flex items-center">
          {title}<Hint text={hint} />
        </span>
        <button onClick={onAdd} className="text-xs text-primary hover:underline flex items-center gap-1">
          <Icon name="Plus" size={12} /> Добавить
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex gap-2 items-center group">
            <Input
              value={item.label}
              onChange={(e) => onChangeLabel(item.id, e.target.value)}
              placeholder="Название статьи"
              className="flex-1 h-8 text-sm border-0 bg-muted/50 focus-visible:ring-1"
            />
            <div className="relative w-28 shrink-0">
              <Input
                type="text"
                inputMode="numeric"
                value={item.amount === 0 ? "" : String(item.amount)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  const num = raw === "" ? 0 : parseInt(raw, 10);
                  onChangeAmount(item.id, num);
                }}
                className="pr-8 h-8 text-sm border-0 bg-muted/50 focus-visible:ring-1"
                placeholder="0"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">{unit}</span>
            </div>
            <button onClick={() => onRemove(item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 shrink-0">
              <Icon name="X" size={12} />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-xs text-muted-foreground italic py-1">
            Нет статей — <button onClick={onAdd} className="text-primary hover:underline">добавьте первую</button>
          </div>
        )}
      </div>
      <div className="flex justify-between text-sm pt-1 border-t border-dashed">
        <span className="text-muted-foreground text-xs">{totalLabel}</span>
        <span className="font-semibold tabular-nums">{fmt(total)} ₽</span>
      </div>
    </div>
  );
}

// ─── Кастомный тултип для графика ─────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const profit = payload[0]?.value ?? 0;
  return (
    <div className="bg-card border rounded-xl shadow-lg px-3 py-2 text-sm">
      <div className="font-medium mb-1">{label} участников</div>
      <div className={`font-bold ${profit < 0 ? "text-red-500" : "text-green-600"}`}>
        {profit < 0 ? "−" : "+"}{fmt(Math.abs(profit))} ₽
      </div>
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export default function EventCalculator({ onCreateEvent }: Props) {
  const [params, setParams] = useState<CalcParams>(defaultParams());
  const [templates, setTemplates] = useState<Template[]>(loadTemplates());
  const [templateName, setTemplateName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const { toast } = useToast();

  const r = calcResults(params);
  const chartData = buildChartData(params);
  const breakeven = findBreakeven(params);
  const isLoss = r.profit < 0;
  const isWarn = !isLoss && r.markupPct < 15;

  const set = useCallback((field: keyof CalcParams, value: unknown) =>
    setParams((p) => ({ ...p, [field]: value })), []);

  const updFixed = (id: string, patch: Partial<CostItem>) =>
    setParams((p) => ({ ...p, fixedItems: p.fixedItems.map((i) => i.id === id ? { ...i, ...patch } : i) }));
  const updVar = (id: string, patch: Partial<CostItem>) =>
    setParams((p) => ({ ...p, varItems: p.varItems.map((i) => i.id === id ? { ...i, ...patch } : i) }));
  const addFixed = () => setParams((p) => ({ ...p, fixedItems: [...p.fixedItems, { id: uid(), label: "", amount: 0 }] }));
  const addVar = () => setParams((p) => ({ ...p, varItems: [...p.varItems, { id: uid(), label: "", amount: 0 }] }));
  const removeFixed = (id: string) => setParams((p) => ({ ...p, fixedItems: p.fixedItems.filter((i) => i.id !== id) }));
  const removeVar = (id: string) => setParams((p) => ({ ...p, varItems: p.varItems.filter((i) => i.id !== id) }));

  // Шаблоны
  const handleSave = () => {
    if (!templateName.trim()) return;
    const tpls = loadTemplates();
    if (tpls.length >= 20) { toast({ title: "Максимум 20 шаблонов", variant: "destructive" }); return; }
    const updated = [...tpls, { id: Date.now().toString(), name: templateName.trim(), params, createdAt: new Date().toISOString() }];
    saveTemplates(updated); setTemplates(updated); setTemplateName(""); setShowSaveForm(false);
    toast({ title: "Шаблон сохранён" });
  };
  const handleLoad = (tpl: Template) => { setParams(tpl.params); setShowTemplates(false); toast({ title: `Шаблон «${tpl.name}» загружен` }); };
  const handleDelete = (id: string) => { const u = templates.filter((t) => t.id !== id); saveTemplates(u); setTemplates(u); };

  // Итоговый статус
  const statusColor = isLoss ? "#ef4444" : isWarn ? "#f59e0b" : "#22c55e";
  const statusBg = isLoss ? "bg-red-50 border-red-200" : isWarn ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200";
  const statusText = isLoss ? "text-red-700" : isWarn ? "text-amber-700" : "text-green-700";

  // Рекомендации
  const recommendations: string[] = [];
  if (isLoss && breakeven !== null) recommendations.push(`Нужно минимум ${breakeven} участников, чтобы выйти в ноль. Сейчас не хватает ${breakeven - params.participants}.`);
  if (isLoss && breakeven === null) recommendations.push("При такой цене событие не окупится даже при максимальной заполненности. Поднимите цену.");
  if (!isLoss && r.markupPct < 10) recommendations.push("Наценка очень маленькая — любая накладка съест прибыль. Рекомендуем поднять цену хотя бы на 10%.");
  if (!isLoss && isWarn) recommendations.push("Прибыль есть, но наценка ниже 15% — риски покрыты не полностью.");
  if (!isLoss && r.markupPct > 50) recommendations.push("Наценка высокая — проверьте, не отпугнёт ли цена гостей. Сравните с рынком.");
  if (params.participants < (breakeven ?? 0)) recommendations.push(`При ${params.participants} гостях убыток. Попробуйте увеличить цену или снизить расходы.`);
  if (r.fixedTotal > 20000) recommendations.push("Постоянные расходы высокие. Проверьте, нет ли позиций, которые можно сократить.");

  // Диапазон ползунка цены
  const priceMin = Math.max(100, Math.round(r.costPerPerson * 0.5));
  const priceMax = Math.max(priceMin + 2000, r.costPerPerson * 4);

  return (
    <div className="space-y-4">

      {/* ── Шапка ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Калькулятор события</h2>
          <p className="text-sm text-muted-foreground">Двигайте ползунки — результат обновляется мгновенно</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { setShowTemplates(!showTemplates); setShowSaveForm(false); }}>
            <Icon name="BookOpen" size={14} className="mr-1.5" />Шаблоны ({templates.length})
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setShowSaveForm(!showSaveForm); setShowTemplates(false); }}>
            <Icon name="Save" size={14} className="mr-1.5" />Сохранить
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setParams(defaultParams()); toast({ title: "Сброшено" }); }}>
            <Icon name="RotateCcw" size={14} />
          </Button>
        </div>
      </div>

      {/* ── Сохранение ── */}
      {showSaveForm && (
        <div className="flex gap-2 p-3 bg-muted rounded-xl">
          <Input placeholder="Название шаблона" value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="flex-1 h-8 text-sm" />
          <Button size="sm" onClick={handleSave} disabled={!templateName.trim()}>Сохранить</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSaveForm(false)}>Отмена</Button>
        </div>
      )}

      {/* ── Шаблоны ── */}
      {showTemplates && (
        <div className="rounded-xl border p-4 space-y-2">
          <div className="text-sm font-medium mb-3">Сохранённые шаблоны</div>
          {templates.length === 0 ? <p className="text-sm text-muted-foreground">Нет шаблонов</p> : templates.map((tpl) => (
            <div key={tpl.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
              <div>
                <div className="font-medium text-sm">{tpl.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(tpl.createdAt).toLocaleDateString("ru-RU")}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleLoad(tpl)}>Загрузить</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(tpl.id)} className="text-destructive hover:text-destructive"><Icon name="Trash2" size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Основная сетка ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Левая часть — ввод */}
        <div className="lg:col-span-2 space-y-4">

          {/* Блок: Участники */}
          <div className="rounded-2xl border bg-card p-4 space-y-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Параметры события</div>

            {/* Участники */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center">
                  Участников
                  <Hint text="Сколько человек вы ожидаете. Перемещайте ползунок — прибыль пересчитается мгновенно." />
                </span>
                <span className="text-2xl font-bold tabular-nums text-primary">{params.participants}</span>
              </div>
              <div className="pt-4">
                <Slider
                  value={params.participants}
                  min={2} max={40} step={1}
                  onChange={(v) => set("participants", v)}
                  formatValue={(v) => `${v}`}
                  colorClass="bg-primary"
                  unit="чел"
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
                  <span className="text-2xl font-bold tabular-nums" style={{ color: statusColor }}>
                    {fmt(r.guestPrice)} ₽
                  </span>
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
                    formatValue={(v) => `${fmt(v)} ₽`}
                    colorClass={isLoss ? "bg-red-400" : isWarn ? "bg-amber-400" : "bg-green-500"}
                    unit="₽"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-3">
                    <span>{fmt(priceMin)} ₽</span>
                    <span className="text-xs text-muted-foreground">себест: {fmt(r.costPerPerson)} ₽/чел</span>
                    <span>{fmt(priceMax)} ₽</span>
                  </div>
                </div>
              ) : (
                <div className="pt-4 space-y-2">
                  <Slider
                    value={params.markup}
                    min={0} max={100} step={5}
                    onChange={(v) => setParams((p) => ({ ...p, markup: v, priceMode: "markup" }))}
                    formatValue={(v) => `${v}%`}
                    colorClass="bg-primary"
                    unit="%"
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
                          type="number"
                          value={params.platformCommission}
                          onChange={(e) => set("platformCommission", +e.target.value)}
                          className="w-14 h-7 text-sm text-center rounded-md border bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
                          min={0} max={100}
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
                          type="number"
                          value={params.clubFee}
                          onChange={(e) => set("clubFee", +e.target.value)}
                          className="w-20 h-7 text-sm text-center rounded-md border bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
                          min={0}
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

        {/* Правая часть — результаты */}
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
            {/* Визуальная шкала */}
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
      </div>
    </div>
  );
}