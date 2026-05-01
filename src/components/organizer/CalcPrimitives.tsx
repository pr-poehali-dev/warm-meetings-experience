import { useState } from "react";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { CostItem, fmt } from "./calc-types";

// ─── Ползунок ─────────────────────────────────────────────────────────────────

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  colorClass?: string;
}

export function Slider({ value, min, max, step = 1, onChange, colorClass = "bg-primary" }: SliderProps) {
  const pct = Math.round(((value - min) / (max - min)) * 100);
  return (
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
      />
      <div
        className={`absolute w-5 h-5 rounded-full border-2 border-white shadow-md ${colorClass} pointer-events-none`}
        style={{ left: `calc(${pct}% - 10px)` }}
      />
    </div>
  );
}

// ─── Редактируемое значение ────────────────────────────────────────────────────

interface EditableValueProps {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

export function EditableValue({ value, min, max, suffix = "", className = "", style, onChange, format }: EditableValueProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const display = format ? format(value) : String(value);

  const commit = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, "");
    if (cleaned !== "") {
      const num = Math.min(max, Math.max(min, parseInt(cleaned, 10)));
      onChange(num);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          autoFocus
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(inputVal); if (e.key === "Escape") setEditing(false); }}
          className="w-20 text-2xl font-bold tabular-nums bg-muted rounded-lg px-2 py-0.5 outline-none text-right border border-primary"
          style={style}
        />
        {suffix && <span className="text-2xl font-bold" style={style}>{suffix}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={() => { setInputVal(String(value)); setEditing(true); }}
      className={`text-2xl font-bold tabular-nums underline decoration-dotted underline-offset-4 cursor-pointer select-none ${className}`}
      style={style}
    >
      {display}{suffix}
    </button>
  );
}

// ─── Tooltip для подсказок ────────────────────────────────────────────────────

export function Hint({ text }: { text: string }) {
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

export function CostSection({ title, hint, items, unit, onAdd, onChangeLabel, onChangeAmount, onRemove, total, totalLabel }: CostSectionProps) {
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

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: number }) {
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
