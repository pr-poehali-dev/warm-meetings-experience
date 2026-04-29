import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";

// ── Типы ──────────────────────────────────────────────────────────────────────

interface CostItem {
  id: string;
  label: string;
  amount: number;
}

export interface CalcParams {
  fixedItems: CostItem[];   // постоянные расходы (аренда, мастера, реклама…)
  varItems: CostItem[];     // переменные расходы (на 1 гостя)
  platformCommission: number;
  clubFee: number;
  participants: number;
  guestPrice: number;
  markup: number;
  priceMode: "manual" | "markup";
}

interface ScenarioRow {
  n: number;
  costPerPerson: number;
  guestPrice: number;
  revenue: number;
  totalCosts: number;
  commission: number;
  profit: number;
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

// ── Константы ─────────────────────────────────────────────────────────────────

const SCENARIO_COUNTS = [4, 6, 8, 10, 12, 14, 16, 18, 20];
const STORAGE_KEY = "calc_templates_v2";

const uid = () => Math.random().toString(36).slice(2, 8);

const defaultParams = (): CalcParams => ({
  fixedItems: [
    { id: uid(), label: "Аренда бани", amount: 9000 },
    { id: uid(), label: "Мастер", amount: 5000 },
    { id: uid(), label: "Реклама", amount: 1000 },
  ],
  varItems: [
    { id: uid(), label: "Чай и травы", amount: 100 },
    { id: uid(), label: "Простыни и тапочки", amount: 50 },
  ],
  platformCommission: 10,
  clubFee: 100,
  participants: 10,
  guestPrice: 1800,
  markup: 20,
  priceMode: "manual",
});

// ── Формулы ───────────────────────────────────────────────────────────────────

function calcResults(p: CalcParams) {
  const fixedTotal = p.fixedItems.reduce((s, i) => s + i.amount, 0);
  const varPerPerson = p.varItems.reduce((s, i) => s + i.amount, 0);
  const totalCosts = fixedTotal + varPerPerson * p.participants;
  const costPerPerson = p.participants > 0 ? fixedTotal / p.participants + varPerPerson : 0;

  let guestPrice = p.guestPrice;
  if (p.priceMode === "markup") {
    guestPrice = Math.ceil((costPerPerson + p.clubFee) * (1 + p.markup / 100));
  }

  const revenue = guestPrice * p.participants;
  const commission = (revenue * p.platformCommission) / 100;
  const clubTotal = p.clubFee * p.participants;
  const profit = revenue - commission - clubTotal - totalCosts;
  const markupPct = costPerPerson > 0
    ? ((guestPrice - costPerPerson - p.clubFee) / costPerPerson) * 100
    : 0;

  return { fixedTotal, varPerPerson, totalCosts, costPerPerson, guestPrice, revenue, commission, clubTotal, profit, markupPct };
}

function buildScenario(p: CalcParams): ScenarioRow[] {
  return SCENARIO_COUNTS.map((n) => {
    const fixedTotal = p.fixedItems.reduce((s, i) => s + i.amount, 0);
    const varPerPerson = p.varItems.reduce((s, i) => s + i.amount, 0);
    const totalCosts = fixedTotal + varPerPerson * n;
    const costPerPerson = n > 0 ? fixedTotal / n + varPerPerson : 0;
    let guestPrice = p.guestPrice;
    if (p.priceMode === "markup") {
      guestPrice = Math.ceil((costPerPerson + p.clubFee) * (1 + p.markup / 100));
    }
    const revenue = guestPrice * n;
    const commission = (revenue * p.platformCommission) / 100;
    const clubTotal = p.clubFee * n;
    const profit = revenue - commission - clubTotal - totalCosts;
    return { n, costPerPerson, guestPrice, revenue, totalCosts, commission, profit };
  });
}

function findBreakeven(p: CalcParams): number | null {
  const fixedTotal = p.fixedItems.reduce((s, i) => s + i.amount, 0);
  const varPerPerson = p.varItems.reduce((s, i) => s + i.amount, 0);
  for (let n = 1; n <= 200; n++) {
    const totalCosts = fixedTotal + varPerPerson * n;
    const commission = (p.guestPrice * n * p.platformCommission) / 100;
    const clubTotal = p.clubFee * n;
    if (p.guestPrice * n - commission - clubTotal - totalCosts >= 0) return n;
  }
  return null;
}

// ── Шаблоны (localStorage) ────────────────────────────────────────────────────

function loadTemplates(): Template[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveTemplates(t: Template[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

// ── Форматирование ────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

// ── Компонент строки статьи ───────────────────────────────────────────────────

interface ItemRowProps {
  item: CostItem;
  unit?: string;
  onChangeLabel: (v: string) => void;
  onChangeAmount: (v: number) => void;
  onRemove: () => void;
}

function ItemRow({ item, unit = "₽", onChangeLabel, onChangeAmount, onRemove }: ItemRowProps) {
  return (
    <div className="flex gap-2 items-center group">
      <Input
        value={item.label}
        onChange={(e) => onChangeLabel(e.target.value)}
        placeholder="Название статьи"
        className="flex-1 h-8 text-sm"
      />
      <div className="relative w-32 shrink-0">
        <Input
          type="number"
          value={item.amount}
          onChange={(e) => onChangeAmount(+e.target.value)}
          className="pr-7 h-8 text-sm"
          min={0}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">
          {unit}
        </span>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
        title="Удалить"
      >
        <Icon name="X" size={14} />
      </button>
    </div>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────────

export default function EventCalculator({ onCreateEvent }: Props) {
  const [params, setParams] = useState<CalcParams>(defaultParams());
  const [templates, setTemplates] = useState<Template[]>(loadTemplates());
  const [templateName, setTemplateName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "table">("summary");
  const { toast } = useToast();

  const results = calcResults(params);
  const scenario = buildScenario(params);
  const breakeven = findBreakeven(params);
  const isLoss = results.profit < 0;

  // Утилиты обновления списков статей
  const updFixed = (id: string, patch: Partial<CostItem>) =>
    setParams((p) => ({ ...p, fixedItems: p.fixedItems.map((i) => i.id === id ? { ...i, ...patch } : i) }));
  const updVar = (id: string, patch: Partial<CostItem>) =>
    setParams((p) => ({ ...p, varItems: p.varItems.map((i) => i.id === id ? { ...i, ...patch } : i) }));

  const addFixed = () =>
    setParams((p) => ({ ...p, fixedItems: [...p.fixedItems, { id: uid(), label: "", amount: 0 }] }));
  const addVar = () =>
    setParams((p) => ({ ...p, varItems: [...p.varItems, { id: uid(), label: "", amount: 0 }] }));

  const removeFixed = (id: string) =>
    setParams((p) => ({ ...p, fixedItems: p.fixedItems.filter((i) => i.id !== id) }));
  const removeVar = (id: string) =>
    setParams((p) => ({ ...p, varItems: p.varItems.filter((i) => i.id !== id) }));

  const set = (field: keyof CalcParams, value: unknown) =>
    setParams((p) => ({ ...p, [field]: value }));

  // Шаблоны
  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    const tpls = loadTemplates();
    if (tpls.length >= 20) { toast({ title: "Максимум 20 шаблонов", variant: "destructive" }); return; }
    const updated = [...tpls, { id: Date.now().toString(), name: templateName.trim(), params, createdAt: new Date().toISOString() }];
    saveTemplates(updated);
    setTemplates(updated);
    setTemplateName("");
    setShowSaveForm(false);
    toast({ title: "Шаблон сохранён" });
  };

  const handleLoadTemplate = (tpl: Template) => {
    setParams(tpl.params);
    setShowTemplates(false);
    toast({ title: `Шаблон «${tpl.name}» загружен` });
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
  };

  const handleReset = () => { setParams(defaultParams()); toast({ title: "Параметры сброшены" }); };

  const handleExportPDF = () => {
    const blob = new Blob([buildPDF(params, results, scenario, breakeven)], { type: "text/html;charset=utf-8" });
    const w = window.open(URL.createObjectURL(blob), "_blank");
    if (w) setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-5">

      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Калькулятор события</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Рассчитайте себестоимость и оптимальную цену</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { setShowTemplates(!showTemplates); setShowSaveForm(false); }}>
            <Icon name="BookOpen" size={14} className="mr-1.5" />
            Шаблоны ({templates.length})
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setShowSaveForm(!showSaveForm); setShowTemplates(false); }}>
            <Icon name="Save" size={14} className="mr-1.5" />
            Сохранить
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Icon name="FileText" size={14} className="mr-1.5" />
            PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <Icon name="RotateCcw" size={14} className="mr-1.5" />
            Сброс
          </Button>
        </div>
      </div>

      {/* Сохранение шаблона */}
      {showSaveForm && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-2">
              <Input
                placeholder="Название шаблона (напр. «Мужской пар у Лешего»)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
                className="flex-1"
              />
              <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>Сохранить</Button>
              <Button variant="ghost" onClick={() => setShowSaveForm(false)}>Отмена</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список шаблонов */}
      {showTemplates && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Сохранённые шаблоны</CardTitle></CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет сохранённых шаблонов</p>
            ) : (
              <div className="space-y-2">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                    <div>
                      <div className="font-medium text-sm">{tpl.name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(tpl.createdAt).toLocaleDateString("ru-RU")}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleLoadTemplate(tpl)}>Загрузить</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(tpl.id)} className="text-destructive hover:text-destructive">
                        <Icon name="Trash2" size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Основная двуколоночная сетка */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Левая колонка: ввод ─────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Постоянные расходы */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Icon name="Wallet" size={14} />
                  Постоянные расходы
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={addFixed} className="h-7 text-xs gap-1">
                  <Icon name="Plus" size={12} />
                  Добавить
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {params.fixedItems.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Нет статей. Нажмите «Добавить».</p>
              )}
              {params.fixedItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  unit="₽"
                  onChangeLabel={(v) => updFixed(item.id, { label: v })}
                  onChangeAmount={(v) => updFixed(item.id, { amount: v })}
                  onRemove={() => removeFixed(item.id)}
                />
              ))}
              <div className="pt-2 border-t flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Итого постоянные:</span>
                <span className="font-semibold">{fmt(results.fixedTotal)} ₽</span>
              </div>
            </CardContent>
          </Card>

          {/* Переменные расходы */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Icon name="Users" size={14} />
                  Переменные расходы (на 1 гостя)
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={addVar} className="h-7 text-xs gap-1">
                  <Icon name="Plus" size={12} />
                  Добавить
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {params.varItems.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Нет статей. Нажмите «Добавить».</p>
              )}
              {params.varItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  unit="₽/чел"
                  onChangeLabel={(v) => updVar(item.id, { label: v })}
                  onChangeAmount={(v) => updVar(item.id, { amount: v })}
                  onRemove={() => removeVar(item.id)}
                />
              ))}
              <div className="pt-2 border-t flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Итого на гостя:</span>
                <span className="font-semibold">{fmt(results.varPerPerson)} ₽/чел</span>
              </div>
            </CardContent>
          </Card>

          {/* Параметры платформы */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Icon name="Percent" size={14} />
                Параметры платформы
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2 items-center">
                <Input
                  value="Комиссия платформы"
                  readOnly
                  className="flex-1 h-8 text-sm bg-muted/50"
                />
                <div className="relative w-32 shrink-0">
                  <Input
                    type="number"
                    value={params.platformCommission}
                    onChange={(e) => set("platformCommission", +e.target.value)}
                    className="pr-6 h-8 text-sm"
                    min={0} max={100}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">%</span>
                </div>
                <div className="w-6" />
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  value="Клубный взнос"
                  readOnly
                  className="flex-1 h-8 text-sm bg-muted/50"
                />
                <div className="relative w-32 shrink-0">
                  <Input
                    type="number"
                    value={params.clubFee}
                    onChange={(e) => set("clubFee", +e.target.value)}
                    className="pr-10 h-8 text-sm"
                    min={0}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">₽/чел</span>
                </div>
                <div className="w-6" />
              </div>
            </CardContent>
          </Card>

          {/* Цена и участники */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Icon name="Tag" size={14} />
                Цена и участники
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 items-center">
                <Input value="Участников (прогноз)" readOnly className="flex-1 h-8 text-sm bg-muted/50" />
                <Input
                  type="number"
                  value={params.participants}
                  onChange={(e) => set("participants", Math.max(1, +e.target.value))}
                  className="w-32 h-8 text-sm shrink-0"
                  min={1}
                />
                <div className="w-6" />
              </div>

              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => set("priceMode", "manual")}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${params.priceMode === "manual" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    Ручная цена
                  </button>
                  <button
                    onClick={() => set("priceMode", "markup")}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${params.priceMode === "markup" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    По наценке
                  </button>
                </div>

                {params.priceMode === "manual" ? (
                  <div className="flex gap-2 items-center">
                    <span className="text-sm flex-1">Цена для гостя</span>
                    <div className="relative w-32">
                      <Input
                        type="number"
                        value={params.guestPrice}
                        onChange={(e) => setParams((p) => ({ ...p, guestPrice: +e.target.value, priceMode: "manual" }))}
                        className="pr-6 h-8 text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">₽</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <span className="text-sm flex-1">Желаемая наценка</span>
                    <div className="relative w-32">
                      <Input
                        type="number"
                        value={params.markup}
                        onChange={(e) => setParams((p) => ({ ...p, markup: +e.target.value, priceMode: "markup" }))}
                        className="pr-6 h-8 text-sm"
                        min={0}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">%</span>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1.5 flex justify-between">
                  {params.priceMode === "markup" ? (
                    <><span>Рассчитанная цена:</span><span className="font-semibold text-foreground">{fmt(results.guestPrice)} ₽</span></>
                  ) : (
                    <><span>Наценка на себестоимость:</span><span className="font-semibold text-foreground">{results.markupPct > 0 ? results.markupPct.toFixed(1) : "—"}%</span></>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Правая колонка: результаты ──────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["summary", "table"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                {t === "summary" ? "Сводка" : "Таблица сценариев"}
              </button>
            ))}
          </div>

          {activeTab === "summary" && (
            <>
              {/* Карточка прибыли */}
              <Card className={isLoss ? "border-destructive/40" : "border-green-500/40"}>
                <CardContent className="pt-5 pb-5">
                  <div className="text-center mb-4">
                    <div className={`text-3xl font-bold ${isLoss ? "text-destructive" : "text-green-600"}`}>
                      {isLoss ? "−" : "+"}{fmt(Math.abs(results.profit))} ₽
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Прибыль при {params.participants} участниках</div>
                    {isLoss
                      ? <Badge variant="destructive" className="mt-2 text-xs">Убыточно</Badge>
                      : <Badge className="mt-2 text-xs bg-green-100 text-green-700">Прибыльно</Badge>
                    }
                  </div>
                  {breakeven !== null ? (
                    <div className={`text-center text-xs py-2 px-3 rounded-lg ${params.participants >= breakeven ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
                      <Icon name="Target" size={12} className="inline mr-1" />
                      Точка безубыточности: <strong>{breakeven} участников</strong>
                      {params.participants < breakeven && ` (нужно ещё ${breakeven - params.participants})`}
                    </div>
                  ) : (
                    <div className="text-center text-xs py-2 px-3 rounded-lg bg-destructive/10 text-destructive">
                      Точка безубыточности не достигается при текущей цене
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Детализация */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Финансовая сводка</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Себестоимость 1 гостя</span>
                      <span className="font-medium">{fmt(results.costPerPerson)} ₽</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Цена для гостя</span>
                      <span className="font-medium">{fmt(results.guestPrice)} ₽</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b text-green-600">
                      <span>Выручка ({params.participants} чел)</span>
                      <span className="font-medium">+{fmt(results.revenue)} ₽</span>
                    </div>
                    {results.commission > 0 && (
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="text-muted-foreground">Комиссия платформы ({params.platformCommission}%)</span>
                        <span className="text-destructive">−{fmt(results.commission)} ₽</span>
                      </div>
                    )}
                    {results.clubTotal > 0 && (
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="text-muted-foreground">Клубные взносы платформе</span>
                        <span className="text-muted-foreground">−{fmt(results.clubTotal)} ₽</span>
                      </div>
                    )}

                    {/* Постоянные расходы — детально */}
                    {params.fixedItems.map((item) => (
                      <div key={item.id} className="flex justify-between py-1 text-xs">
                        <span className="text-muted-foreground pl-2">{item.label || "Без названия"}</span>
                        <span className="text-destructive">−{fmt(item.amount)} ₽</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1.5 border-b border-t">
                      <span className="text-muted-foreground text-xs font-medium">Постоянные расходы (итого)</span>
                      <span className="text-destructive text-xs font-medium">−{fmt(results.fixedTotal)} ₽</span>
                    </div>

                    {/* Переменные расходы — детально */}
                    {params.varItems.map((item) => (
                      <div key={item.id} className="flex justify-between py-1 text-xs">
                        <span className="text-muted-foreground pl-2">{item.label || "Без названия"} × {params.participants}</span>
                        <span className="text-destructive">−{fmt(item.amount * params.participants)} ₽</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1.5 border-b border-t">
                      <span className="text-muted-foreground text-xs font-medium">Переменные расходы (итого)</span>
                      <span className="text-destructive text-xs font-medium">−{fmt(results.varPerPerson * params.participants)} ₽</span>
                    </div>

                    <div className={`flex justify-between py-2 font-bold text-base ${isLoss ? "text-destructive" : "text-green-700"}`}>
                      <span>Прибыль организатора</span>
                      <span>{isLoss ? "−" : "+"}{fmt(Math.abs(results.profit))} ₽</span>
                    </div>
                  </div>

                  {(results.commission > 0 || results.clubTotal > 0) && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <div className="font-medium mb-1">Доход платформы:</div>
                      {results.commission > 0 && <div className="flex justify-between"><span>Комиссия</span><span>{fmt(results.commission)} ₽</span></div>}
                      {results.clubTotal > 0 && <div className="flex justify-between"><span>Клубные взносы</span><span>{fmt(results.clubTotal)} ₽</span></div>}
                      <div className="flex justify-between font-medium pt-1 border-t mt-1">
                        <span>Итого платформе</span><span>{fmt(results.commission + results.clubTotal)} ₽</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {isLoss && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex gap-3">
                      <Icon name="AlertTriangle" size={18} className="text-orange-500 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-orange-800">Событие убыточно</div>
                        <div className="text-orange-700 mt-1">
                          {breakeven !== null
                            ? `Увеличьте количество участников до ${breakeven} или повысьте цену`
                            : "При текущей цене событие не выйдет в плюс. Увеличьте цену для гостя."}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {onCreateEvent && (
                <Button className="w-full gap-2" onClick={() => onCreateEvent(params)}>
                  <Icon name="Plus" size={16} />
                  Создать событие на основе расчёта
                </Button>
              )}
            </>
          )}

          {activeTab === "table" && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Зависимость от числа участников</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-muted-foreground font-medium">Чел</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Себест./чел</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Цена</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Выручка</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Расходы</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Прибыль</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenario.map((row) => {
                        const isCurrent = row.n === params.participants;
                        const isBreak = breakeven !== null && row.n === breakeven;
                        return (
                          <tr key={row.n} className={`border-b last:border-0 ${isCurrent ? "bg-primary/5" : ""} ${isBreak ? "bg-green-50" : ""}`}>
                            <td className="py-2 font-medium">
                              {row.n}
                              {isCurrent && <span className="ml-1 text-primary text-[10px]">◀</span>}
                              {isBreak && <span className="ml-1 text-green-600 text-[10px]">✓</span>}
                            </td>
                            <td className="py-2 text-right">{fmt(row.costPerPerson)}</td>
                            <td className="py-2 text-right">{fmt(row.guestPrice)}</td>
                            <td className="py-2 text-right text-green-600">{fmt(row.revenue)}</td>
                            <td className="py-2 text-right">{fmt(row.totalCosts + row.commission)}</td>
                            <td className={`py-2 text-right font-semibold ${row.profit < 0 ? "text-destructive" : "text-green-600"}`}>
                              {row.profit < 0 ? "−" : "+"}{fmt(Math.abs(row.profit))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {breakeven !== null && (
                  <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="text-green-600 font-bold">✓</span>
                    Точка безубыточности: {breakeven} участников
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PDF ───────────────────────────────────────────────────────────────────────

function buildPDF(
  params: CalcParams,
  results: ReturnType<typeof calcResults>,
  scenario: ScenarioRow[],
  breakeven: number | null
): string {
  const f = (n: number) => n.toLocaleString("ru-RU");
  const isLoss = results.profit < 0;
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Калькулятор события</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;color:#333;margin:20px}
h1{font-size:18px}h2{font-size:13px;font-weight:bold;margin:14px 0 6px;border-bottom:1px solid #eee;padding-bottom:3px}
table{width:100%;border-collapse:collapse;margin-bottom:10px}th,td{padding:5px 7px;text-align:left;border-bottom:1px solid #eee}
th{font-weight:bold;background:#f5f5f5}.r{text-align:right}
.profit{font-size:20px;font-weight:bold;color:${isLoss ? "#e53e3e" : "#38a169"}}
.warn{background:#fff3cd;padding:8px;border-radius:4px;margin:8px 0;font-size:11px}</style></head><body>
<h1>Калькулятор события</h1><p style="color:#666">Расчёт для ${params.participants} участников</p>
<h2>Постоянные расходы</h2><table>
<tr><th>Статья</th><th class="r">Сумма</th></tr>
${params.fixedItems.map((i) => `<tr><td>${i.label || "Без названия"}</td><td class="r">${f(i.amount)} ₽</td></tr>`).join("")}
<tr style="font-weight:bold"><td>Итого</td><td class="r">${f(results.fixedTotal)} ₽</td></tr></table>
<h2>Переменные расходы (на 1 гостя)</h2><table>
<tr><th>Статья</th><th class="r">На гостя</th><th class="r">На ${params.participants} чел</th></tr>
${params.varItems.map((i) => `<tr><td>${i.label || "Без названия"}</td><td class="r">${f(i.amount)} ₽</td><td class="r">${f(i.amount * params.participants)} ₽</td></tr>`).join("")}
<tr style="font-weight:bold"><td>Итого</td><td class="r">${f(results.varPerPerson)} ₽</td><td class="r">${f(results.varPerPerson * params.participants)} ₽</td></tr></table>
<h2>Финансовый результат</h2><table>
<tr><td>Себестоимость 1 гостя</td><td class="r">${f(results.costPerPerson)} ₽</td></tr>
<tr><td>Цена для гостя</td><td class="r">${f(results.guestPrice)} ₽</td></tr>
<tr><td>Выручка</td><td class="r">${f(results.revenue)} ₽</td></tr>
${results.commission > 0 ? `<tr><td>Комиссия платформы (${params.platformCommission}%)</td><td class="r">−${f(results.commission)} ₽</td></tr>` : ""}
${results.clubTotal > 0 ? `<tr><td>Клубные взносы</td><td class="r">−${f(results.clubTotal)} ₽</td></tr>` : ""}</table>
<div class="profit">${isLoss ? "Убыток: −" : "Прибыль: +"}${f(Math.abs(results.profit))} ₽</div>
${breakeven !== null ? `<p>Точка безубыточности: <strong>${breakeven} участников</strong></p>` : ""}
${isLoss ? `<div class="warn">⚠️ Событие убыточно при ${params.participants} участниках</div>` : ""}
<h2>Таблица сценариев</h2><table>
<tr><th>Участников</th><th class="r">Себест./чел</th><th class="r">Цена</th><th class="r">Выручка</th><th class="r">Расходы</th><th class="r">Прибыль</th></tr>
${scenario.map((r) => `<tr><td>${r.n}${r.n === breakeven ? " ✓" : ""}</td><td class="r">${f(r.costPerPerson)} ₽</td><td class="r">${f(r.guestPrice)} ₽</td><td class="r">${f(r.revenue)} ₽</td><td class="r">${f(r.totalCosts + r.commission)} ₽</td><td class="r" style="color:${r.profit < 0 ? "#e53e3e" : "#38a169"}">${r.profit < 0 ? "−" : "+"}${f(Math.abs(r.profit))} ₽</td></tr>`).join("")}
</table></body></html>`;
}
