import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import {
  CalcParams, Template, uid, loadTemplates, saveTemplates,
  defaultParams, calcResults, buildChartData, findBreakeven,
} from "./calc-types";
import CalcInputPanel from "./CalcInputPanel";
import CalcResultPanel from "./CalcResultPanel";

interface Props {
  onCreateEvent?: (params: CalcParams) => void;
}

export { CalcParams };

export default function EventCalculator({ onCreateEvent }: Props) {
  const [params, setParams] = useState<CalcParams>(defaultParams());
  const [templates, setTemplates] = useState<Template[]>(loadTemplates());
  const [templateName, setTemplateName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const { toast } = useToast();

  const r = calcResults(params);
  const chartData = buildChartData(params);
  const breakeven = findBreakeven(params);
  const isLoss = r.profit < 0;
  const isWarn = !isLoss && r.markupPct < 15;

  const set = useCallback((field: keyof CalcParams, value: unknown) =>
    setParams((p) => ({ ...p, [field]: value })), []);

  const updFixed = (id: string, patch: { label?: string; amount?: number }) =>
    setParams((p) => ({ ...p, fixedItems: p.fixedItems.map((i) => i.id === id ? { ...i, ...patch } : i) }));
  const updVar = (id: string, patch: { label?: string; amount?: number }) =>
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
        <CalcInputPanel
          params={params}
          r={r}
          isLoss={isLoss}
          isWarn={isWarn}
          statusColor={statusColor}
          set={set}
          setParams={setParams}
          addFixed={addFixed}
          addVar={addVar}
          updFixed={updFixed}
          updVar={updVar}
          removeFixed={removeFixed}
          removeVar={removeVar}
        />
        <CalcResultPanel
          params={params}
          r={r}
          chartData={chartData}
          breakeven={breakeven}
          isLoss={isLoss}
          isWarn={isWarn}
          statusColor={statusColor}
          statusBg={statusBg}
          statusText={statusText}
          recommendations={recommendations}
          onCreateEvent={onCreateEvent}
        />
      </div>
    </div>
  );
}
