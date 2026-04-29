import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";

interface Master {
  id: string;
  name: string;
  fee: number;
}

export interface CalcParams {
  rent: number;
  masters: Master[];
  fixedCosts: number;
  platformCommission: number;
  clubFee: number;
  tablePerPerson: number;
  extraPerPerson: number;
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

const SCENARIO_COUNTS = [4, 6, 8, 10, 12, 14, 16, 18, 20];

const defaultParams = (): CalcParams => ({
  rent: 9000,
  masters: [{ id: "1", name: "Мастер", fee: 5000 }],
  fixedCosts: 1000,
  platformCommission: 10,
  clubFee: 100,
  tablePerPerson: 150,
  extraPerPerson: 0,
  participants: 10,
  guestPrice: 1800,
  markup: 20,
  priceMode: "manual",
});

function calcResults(p: CalcParams) {
  const fixedTotal = p.rent + p.masters.reduce((s, m) => s + m.fee, 0) + p.fixedCosts;
  const varPerPerson = p.tablePerPerson + p.extraPerPerson;
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

  const markup =
    costPerPerson > 0 ? ((guestPrice - costPerPerson - p.clubFee) / costPerPerson) * 100 : 0;

  return { fixedTotal, varPerPerson, totalCosts, costPerPerson, guestPrice, revenue, commission, clubTotal, profit, markup };
}

function buildScenario(p: CalcParams): ScenarioRow[] {
  return SCENARIO_COUNTS.map((n) => {
    const fixedTotal = p.rent + p.masters.reduce((s, m) => s + m.fee, 0) + p.fixedCosts;
    const varPerPerson = p.tablePerPerson + p.extraPerPerson;
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
  for (let n = 1; n <= 100; n++) {
    const fixedTotal = p.rent + p.masters.reduce((s, m) => s + m.fee, 0) + p.fixedCosts;
    const varPerPerson = p.tablePerPerson + p.extraPerPerson;
    const totalCosts = fixedTotal + varPerPerson * n;
    const commission = (p.guestPrice * n * p.platformCommission) / 100;
    const clubTotal = p.clubFee * n;
    const profit = p.guestPrice * n - commission - clubTotal - totalCosts;
    if (profit >= 0) return n;
  }
  return null;
}

const fmt = (n: number) =>
  n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const STORAGE_KEY = "calc_templates";

function loadTemplates(): Template[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTemplates(tpls: Template[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tpls));
}

export default function EventCalculator({ onCreateEvent }: Props) {
  const [params, setParams] = useState<CalcParams>(defaultParams());
  const [templates, setTemplates] = useState<Template[]>(loadTemplates());
  const [templateName, setTemplateName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTab, setActiveTab] = useState<"table" | "summary">("summary");
  const { toast } = useToast();

  const set = (field: keyof CalcParams, value: unknown) =>
    setParams((p) => ({ ...p, [field]: value }));

  const results = calcResults(params);
  const scenario = buildScenario(params);
  const breakeven = findBreakeven(params);

  const addMaster = () =>
    set("masters", [
      ...params.masters,
      { id: Date.now().toString(), name: "", fee: 3000 },
    ]);

  const removeMaster = (id: string) =>
    set("masters", params.masters.filter((m) => m.id !== id));

  const updateMaster = (id: string, field: "name" | "fee", value: string | number) =>
    set(
      "masters",
      params.masters.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );

  const handlePriceChange = (val: number) => {
    setParams((p) => ({ ...p, guestPrice: val, priceMode: "manual" }));
  };

  const handleMarkupChange = (val: number) => {
    setParams((p) => ({ ...p, markup: val, priceMode: "markup" }));
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    const tpls = loadTemplates();
    if (tpls.length >= 20) {
      toast({ title: "Максимум 20 шаблонов", variant: "destructive" });
      return;
    }
    const newTpl: Template = {
      id: Date.now().toString(),
      name: templateName.trim(),
      params,
      createdAt: new Date().toISOString(),
    };
    const updated = [...tpls, newTpl];
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

  const handleReset = () => {
    setParams(defaultParams());
    toast({ title: "Параметры сброшены" });
  };

  const handleExportPDF = () => {
    const content = buildPDFContent(params, results, scenario, breakeven);
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) setTimeout(() => w.print(), 500);
  };

  const isLoss = results.profit < 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Калькулятор события</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Рассчитайте себестоимость и оптимальную цену
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
            <Icon name="BookOpen" size={14} className="mr-1.5" />
            Шаблоны ({templates.length})
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSaveForm(!showSaveForm)}>
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
              <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
                Сохранить
              </Button>
              <Button variant="ghost" onClick={() => setShowSaveForm(false)}>
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showTemplates && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Сохранённые шаблоны</CardTitle>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет сохранённых шаблонов</p>
            ) : (
              <div className="space-y-2">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                    <div>
                      <div className="font-medium text-sm">{tpl.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tpl.createdAt).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleLoadTemplate(tpl)}>
                        Загрузить
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        className="text-destructive hover:text-destructive"
                      >
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Левая колонка — ввод параметров */}
        <div className="space-y-4">
          {/* Постоянные расходы */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Icon name="Wallet" size={14} />
                Постоянные расходы
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="w-48 text-sm shrink-0">Аренда бани</Label>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={params.rent}
                    onChange={(e) => set("rent", +e.target.value)}
                    className="pr-6"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₽</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Гонорары мастеров</Label>
                  <Button size="sm" variant="ghost" onClick={addMaster} className="h-7 text-xs gap-1">
                    <Icon name="Plus" size={12} />
                    Добавить
                  </Button>
                </div>
                {params.masters.map((m) => (
                  <div key={m.id} className="flex gap-2 mb-2">
                    <Input
                      placeholder="Имя мастера"
                      value={m.name}
                      onChange={(e) => updateMaster(m.id, "name", e.target.value)}
                      className="flex-1"
                    />
                    <div className="relative w-32">
                      <Input
                        type="number"
                        value={m.fee}
                        onChange={(e) => updateMaster(m.id, "fee", +e.target.value)}
                        className="pr-6"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₽</span>
                    </div>
                    {params.masters.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMaster(m.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Icon name="X" size={14} />
                      </Button>
                    )}
                  </div>
                ))}
                <div className="text-xs text-muted-foreground mt-1">
                  Итого мастера: {fmt(params.masters.reduce((s, m) => s + m.fee, 0))} ₽
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label className="w-48 text-sm shrink-0">Прочие расходы</Label>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={params.fixedCosts}
                    onChange={(e) => set("fixedCosts", +e.target.value)}
                    className="pr-6"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₽</span>
                </div>
              </div>

              <div className="pt-1 border-t flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Итого постоянные:</span>
                <span className="font-semibold">{fmt(results.fixedTotal)} ₽</span>
              </div>
            </CardContent>
          </Card>

          {/* Переменные расходы */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Icon name="Users" size={14} />
                Переменные расходы (на 1 гостя)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="w-48 text-sm shrink-0">Стол / угощения</Label>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={params.tablePerPerson}
                    onChange={(e) => set("tablePerPerson", +e.target.value)}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₽/чел</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-48 text-sm shrink-0">Доп. услуги</Label>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={params.extraPerPerson}
                    onChange={(e) => set("extraPerPerson", +e.target.value)}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₽/чел</span>
                </div>
              </div>
              <div className="pt-1 border-t flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Итого на гостя:</span>
                <span className="font-semibold">{fmt(results.varPerPerson)} ₽/чел</span>
              </div>
            </CardContent>
          </Card>

          {/* Параметры платформы */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Icon name="Percent" size={14} />
                Параметры платформы
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="w-48 text-sm shrink-0">Комиссия платформы</Label>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={params.platformCommission}
                    onChange={(e) => set("platformCommission", +e.target.value)}
                    className="pr-6"
                    min={0}
                    max={100}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-48 text-sm shrink-0">Клубный взнос</Label>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={params.clubFee}
                    onChange={(e) => set("clubFee", +e.target.value)}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₽/чел</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Цена и участники */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Icon name="Tag" size={14} />
                Цена и участники
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="w-48 text-sm shrink-0">Участников (прогноз)</Label>
                <Input
                  type="number"
                  value={params.participants}
                  onChange={(e) => set("participants", +e.target.value)}
                  className="flex-1"
                  min={1}
                />
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
                  <div className="flex items-center gap-3">
                    <Label className="text-sm">Цена для гостя</Label>
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        value={params.guestPrice}
                        onChange={(e) => handlePriceChange(+e.target.value)}
                        className="pr-6"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₽</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Label className="text-sm">Желаемая наценка</Label>
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        value={params.markup}
                        onChange={(e) => handleMarkupChange(+e.target.value)}
                        className="pr-6"
                        min={0}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                )}

                {params.priceMode === "markup" && (
                  <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1.5">
                    Рассчитанная цена: <span className="font-semibold text-foreground">{fmt(results.guestPrice)} ₽</span>
                  </div>
                )}
                {params.priceMode === "manual" && results.markup > 0 && (
                  <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1.5">
                    Наценка на себестоимость: <span className="font-semibold text-foreground">{results.markup.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Правая колонка — результаты */}
        <div className="space-y-4">
          {/* Переключатель */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "summary" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Сводка
            </button>
            <button
              onClick={() => setActiveTab("table")}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "table" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Таблица сценариев
            </button>
          </div>

          {activeTab === "summary" && (
            <>
              {/* Карточка прибыли */}
              <Card className={isLoss ? "border-destructive/40" : "border-green-500/40"}>
                <CardContent className="pt-5">
                  <div className="text-center mb-4">
                    <div className={`text-3xl font-bold ${isLoss ? "text-destructive" : "text-green-600"}`}>
                      {isLoss ? "−" : "+"}{fmt(Math.abs(results.profit))} ₽
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Прибыль при {params.participants} участниках
                    </div>
                    {isLoss && (
                      <Badge variant="destructive" className="mt-2 text-xs">
                        Убыточно
                      </Badge>
                    )}
                    {!isLoss && (
                      <Badge className="mt-2 text-xs bg-green-100 text-green-700">
                        Прибыльно
                      </Badge>
                    )}
                  </div>

                  {breakeven !== null && (
                    <div className={`text-center text-xs py-2 px-3 rounded-lg ${params.participants >= breakeven ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
                      <Icon name="Target" size={12} className="inline mr-1" />
                      Точка безубыточности: <strong>{breakeven} участников</strong>
                      {params.participants < breakeven && ` (нужно ещё ${breakeven - params.participants})`}
                    </div>
                  )}
                  {breakeven === null && (
                    <div className="text-center text-xs py-2 px-3 rounded-lg bg-destructive/10 text-destructive">
                      Точка безубыточности не достигается при текущей цене
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Детали */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Финансовая сводка</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Себестоимость 1 гостя</span>
                      <span className="font-medium">{fmt(results.costPerPerson)} ₽</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Цена для гостя</span>
                      <span className="font-medium">{fmt(results.guestPrice)} ₽</span>
                    </div>
                    {params.clubFee > 0 && (
                      <div className="flex justify-between py-1.5 border-b text-xs">
                        <span className="text-muted-foreground pl-3">— из них платформе (взнос)</span>
                        <span>{fmt(params.clubFee)} ₽</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Выручка организатора</span>
                      <span className="font-medium text-green-600">+{fmt(results.revenue)} ₽</span>
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
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Постоянные расходы</span>
                      <span className="text-destructive">−{fmt(results.fixedTotal)} ₽</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Переменные расходы ({params.participants} чел)</span>
                      <span className="text-destructive">−{fmt(results.varPerPerson * params.participants)} ₽</span>
                    </div>
                    <div className={`flex justify-between py-2 font-bold ${isLoss ? "text-destructive" : "text-green-700"}`}>
                      <span>Прибыль организатора</span>
                      <span>{isLoss ? "−" : "+"}{fmt(Math.abs(results.profit))} ₽</span>
                    </div>
                  </div>

                  {(results.commission > 0 || results.clubTotal > 0) && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <div className="font-medium mb-1">Доход платформы:</div>
                      {results.commission > 0 && (
                        <div className="flex justify-between">
                          <span>Комиссия</span>
                          <span>{fmt(results.commission)} ₽</span>
                        </div>
                      )}
                      {results.clubTotal > 0 && (
                        <div className="flex justify-between">
                          <span>Клубные взносы</span>
                          <span>{fmt(results.clubTotal)} ₽</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium pt-1 border-t mt-1">
                        <span>Итого платформе</span>
                        <span>{fmt(results.commission + results.clubTotal)} ₽</span>
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
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Зависимость от числа участников</CardTitle>
              </CardHeader>
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
                        const isBreak = breakeven !== null && row.n === breakeven;
                        const rowLoss = row.profit < 0;
                        const isCurrent = row.n === params.participants;
                        return (
                          <tr
                            key={row.n}
                            className={`border-b last:border-0 transition-colors ${isCurrent ? "bg-primary/5" : ""} ${isBreak ? "bg-green-50" : ""}`}
                          >
                            <td className="py-2 font-medium">
                              {row.n}
                              {isCurrent && <span className="ml-1 text-primary text-[10px]">◀</span>}
                              {isBreak && <span className="ml-1 text-green-600 text-[10px]">✓</span>}
                            </td>
                            <td className="py-2 text-right">{fmt(row.costPerPerson)}</td>
                            <td className="py-2 text-right">{fmt(row.guestPrice)}</td>
                            <td className="py-2 text-right text-green-600">{fmt(row.revenue)}</td>
                            <td className="py-2 text-right">{fmt(row.totalCosts + row.commission)}</td>
                            <td className={`py-2 text-right font-semibold ${rowLoss ? "text-destructive" : "text-green-600"}`}>
                              {rowLoss ? "−" : "+"}{fmt(Math.abs(row.profit))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {breakeven !== null && (
                  <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="text-green-600">✓</span>
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

function buildPDFContent(
  params: CalcParams,
  results: ReturnType<typeof calcResults>,
  scenario: ScenarioRow[],
  breakeven: number | null
): string {
  const fmt2 = (n: number) => n.toLocaleString("ru-RU");
  const isLoss = results.profit < 0;
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Калькулятор события</title>
<style>
body{font-family:Arial,sans-serif;font-size:12px;color:#333;margin:20px}
h1{font-size:18px;margin-bottom:4px}
.sub{color:#666;margin-bottom:20px}
h2{font-size:13px;font-weight:bold;margin:16px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
th,td{padding:6px 8px;text-align:left;border-bottom:1px solid #eee}
th{font-weight:bold;background:#f5f5f5}
.right{text-align:right}
.profit{font-size:20px;font-weight:bold;color:${isLoss ? "#e53e3e" : "#38a169"}}
.warn{background:#fff3cd;padding:8px;border-radius:4px;margin:8px 0}
</style></head><body>
<h1>Калькулятор события</h1>
<p class="sub">Расчёт для ${params.participants} участников</p>
<h2>Расходы</h2>
<table>
<tr><th>Статья</th><th class="right">Сумма</th></tr>
<tr><td>Аренда бани</td><td class="right">${fmt2(params.rent)} ₽</td></tr>
${params.masters.map((m) => `<tr><td>Мастер${m.name ? " " + m.name : ""}</td><td class="right">${fmt2(m.fee)} ₽</td></tr>`).join("")}
<tr><td>Прочие расходы</td><td class="right">${fmt2(params.fixedCosts)} ₽</td></tr>
<tr><td>Стол/угощения (${params.participants} чел × ${params.tablePerPerson} ₽)</td><td class="right">${fmt2(params.tablePerPerson * params.participants)} ₽</td></tr>
${params.extraPerPerson > 0 ? `<tr><td>Доп. услуги (${params.participants} чел × ${params.extraPerPerson} ₽)</td><td class="right">${fmt2(params.extraPerPerson * params.participants)} ₽</td></tr>` : ""}
<tr style="font-weight:bold"><td>Итого расходы</td><td class="right">${fmt2(results.totalCosts)} ₽</td></tr>
</table>
<h2>Финансовый результат</h2>
<table>
<tr><td>Себестоимость 1 гостя</td><td class="right">${fmt2(results.costPerPerson)} ₽</td></tr>
<tr><td>Цена для гостя</td><td class="right">${fmt2(results.guestPrice)} ₽</td></tr>
<tr><td>Выручка</td><td class="right">${fmt2(results.revenue)} ₽</td></tr>
${results.commission > 0 ? `<tr><td>Комиссия платформы (${params.platformCommission}%)</td><td class="right">−${fmt2(results.commission)} ₽</td></tr>` : ""}
${results.clubTotal > 0 ? `<tr><td>Клубные взносы</td><td class="right">−${fmt2(results.clubTotal)} ₽</td></tr>` : ""}
</table>
<div class="profit">${isLoss ? "Убыток: −" : "Прибыль: +"}${fmt2(Math.abs(results.profit))} ₽</div>
${breakeven !== null ? `<p>Точка безубыточности: <strong>${breakeven} участников</strong></p>` : ""}
${isLoss ? `<div class="warn">⚠️ Событие убыточно при ${params.participants} участниках</div>` : ""}
<h2>Таблица сценариев</h2>
<table>
<tr><th>Участников</th><th class="right">Себест./чел</th><th class="right">Цена</th><th class="right">Выручка</th><th class="right">Расходы</th><th class="right">Прибыль</th></tr>
${scenario.map((r) => `<tr><td>${r.n}${r.n === breakeven ? " ✓" : ""}</td><td class="right">${fmt2(r.costPerPerson)} ₽</td><td class="right">${fmt2(r.guestPrice)} ₽</td><td class="right">${fmt2(r.revenue)} ₽</td><td class="right">${fmt2(r.totalCosts + r.commission)} ₽</td><td class="right" style="color:${r.profit < 0 ? "#e53e3e" : "#38a169"}">${r.profit < 0 ? "−" : "+"}${fmt2(Math.abs(r.profit))} ₽</td></tr>`).join("")}
</table>
</body></html>`;
}