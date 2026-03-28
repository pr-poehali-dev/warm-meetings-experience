import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

interface RepeatEventDialogProps {
  eventTitle: string;
  eventDate: string;
  loading: boolean;
  onConfirm: (dates: string[]) => void;
  onCancel: () => void;
}

type RepeatMode = "weekly" | "biweekly" | "custom";

export default function RepeatEventDialog({
  eventTitle,
  eventDate,
  loading,
  onConfirm,
  onCancel,
}: RepeatEventDialogProps) {
  const [mode, setMode] = useState<RepeatMode>("weekly");
  const [count, setCount] = useState(4);
  const [customDates, setCustomDates] = useState<string[]>([""]);

  const generateDates = (): string[] => {
    if (mode === "custom") {
      return customDates.filter((d) => d);
    }
    const interval = mode === "weekly" ? 7 : 14;
    const base = new Date(eventDate);
    const dates: string[] = [];
    for (let i = 1; i <= count; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + interval * i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };

  const dates = generateDates();

  const addCustomDate = () => setCustomDates((d) => [...d, ""]);
  const removeCustomDate = (idx: number) =>
    setCustomDates((d) => d.filter((_, i) => i !== idx));
  const setCustomDate = (idx: number, val: string) =>
    setCustomDates((d) => d.map((v, i) => (i === idx ? val : v)));

  const MODES: { value: RepeatMode; label: string }[] = [
    { value: "weekly", label: "Каждую неделю" },
    { value: "biweekly", label: "Раз в 2 недели" },
    { value: "custom", label: "Вручную" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white border border-gray-200 rounded-lg p-6 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-1">Повторить встречу</h3>
        <p className="text-sm text-gray-500 mb-5 line-clamp-1">{eventTitle}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Режим повтора
            </label>
            <div className="flex gap-2 flex-wrap">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    mode === m.value
                      ? "bg-gray-900 text-white border-gray-900"
                      : "border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {mode !== "custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Количество повторов
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  -
                </button>
                <span className="text-lg font-semibold w-8 text-center">{count}</span>
                <button
                  onClick={() => setCount((c) => Math.min(12, c + 1))}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {mode === "custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Даты встреч
              </label>
              <div className="space-y-2">
                {customDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="date"
                      value={d}
                      onChange={(e) => setCustomDate(i, e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    />
                    {customDates.length > 1 && (
                      <button
                        onClick={() => removeCustomDate(i)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Icon name="X" size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addCustomDate}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <Icon name="Plus" size={14} />
                  Добавить дату
                </button>
              </div>
            </div>
          )}

          {dates.length > 0 && mode !== "custom" && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                Будут созданы встречи на:
              </p>
              <div className="flex flex-wrap gap-2">
                {dates.map((d) => (
                  <span
                    key={d}
                    className="text-xs bg-white border border-gray-200 px-2 py-1 rounded"
                  >
                    {new Date(d).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      weekday: "short",
                    })}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={() => onConfirm(dates)}
            disabled={loading || dates.length === 0}
          >
            {loading ? (
              <Icon name="Loader2" size={14} className="animate-spin mr-2" />
            ) : (
              <Icon name="Copy" size={14} className="mr-2" />
            )}
            Создать {dates.length} встреч
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}