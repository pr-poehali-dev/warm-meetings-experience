import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface PricingCalculatorProps {
  lines: string[];
  onTotalChange?: (total: number | null) => void;
}

function parsePrice(line: string): number | null {
  const cleaned = line.replace(/\s/g, "");
  const match = cleaned.match(/(\d[\d\s]*)(?:₽|руб\.?)/i);
  if (!match) return null;
  const num = parseInt(match[1].replace(/\D/g, ""), 10);
  return isNaN(num) ? null : num;
}

function formatAmount(n: number): string {
  return n.toLocaleString("ru-RU") + " ₽";
}

export default function PricingCalculator({ lines, onTotalChange }: PricingCalculatorProps) {
  const items = lines
    .map((line) => ({ label: line, price: parsePrice(line) }))
    .filter((item) => item.label.trim());

  const hasPrices = items.some((i) => i.price !== null);

  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));

  useEffect(() => {
    setChecked(items.map(() => false));
  }, [lines.join("|")]);

  const total = hasPrices
    ? items.reduce((sum, item, i) => sum + (checked[i] && item.price ? item.price : 0), 0)
    : null;

  useEffect(() => {
    onTotalChange?.(total);
  }, [total]);

  const toggle = (i: number) => {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const anyChecked = checked.some(Boolean);
  const allChecked = checked.every(Boolean);
  const toggleAll = () => setChecked(items.map(() => !allChecked));

  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Состав участия
        </span>
        {hasPrices && items.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-primary hover:underline"
          >
            {allChecked ? "Снять всё" : "Выбрать всё"}
          </button>
        )}
      </div>

      <ul className="divide-y divide-border">
        {items.map((item, i) => (
          <li key={i}>
            <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div
                className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${
                  checked[i]
                    ? "bg-primary border-primary"
                    : "border-border bg-background"
                }`}
                onClick={() => toggle(i)}
              >
                {checked[i] && <Icon name="Check" size={12} className="text-primary-foreground" />}
              </div>
              <span
                className={`flex-1 text-sm leading-snug transition-colors ${
                  checked[i] ? "text-foreground" : "text-muted-foreground"
                }`}
                onClick={() => toggle(i)}
              >
                {item.label}
              </span>
              {item.price !== null && (
                <span
                  className={`text-sm font-medium flex-shrink-0 transition-colors ${
                    checked[i] ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {formatAmount(item.price)}
                </span>
              )}
            </label>
          </li>
        ))}
      </ul>

      {hasPrices && (
        <div
          className={`flex items-center justify-between px-3 py-2.5 border-t border-border transition-all ${
            anyChecked ? "bg-primary/5" : "bg-muted/20"
          }`}
        >
          <span className="text-sm font-medium text-muted-foreground">Итого:</span>
          <span
            className={`text-base font-bold transition-colors ${
              anyChecked ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {anyChecked ? formatAmount(total ?? 0) : "—"}
          </span>
        </div>
      )}
    </div>
  );
}
