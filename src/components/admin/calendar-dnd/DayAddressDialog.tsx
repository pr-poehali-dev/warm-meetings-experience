import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { MasterAddress } from "@/lib/master-calendar-api";

/** null = явный выезд, "clear" = сбросить адрес дня (не задан), number = id адреса */
export type DayAddressValue = number | null | "clear";

interface Props {
  dayLabel: string;
  addresses: MasterAddress[];
  /** null = явный выезд, undefined = не задан, number = id адреса */
  currentAddressId: number | null | undefined;
  /** true — текущее состояние «явный выезд» (address_id = null в БД) */
  currentIsTravel?: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: (value: DayAddressValue) => void;
}

export default function DayAddressDialog({
  dayLabel, addresses, currentAddressId, currentIsTravel, saving, onClose, onSave,
}: Props) {
  const initValue = (): DayAddressValue => {
    if (currentIsTravel) return null;
    if (currentAddressId != null) return currentAddressId;
    return "clear";
  };

  const [selected, setSelected] = useState<DayAddressValue>(initValue);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="MapPin" size={18} className="text-primary" />
            Адрес дня
          </DialogTitle>
          <DialogDescription className="text-xs capitalize">{dayLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-1">
          <p className="text-[11px] text-muted-foreground">
            Адрес применится ко всем слотам этого дня. У отдельного слота можно
            задать свой адрес — он будет в приоритете. Без адреса день считается выездным.
          </p>

          {/* Не задан — сброс адреса дня */}
          <button
            onClick={() => setSelected("clear")}
            className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
              selected === "clear" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            }`}
          >
            <Icon name="Minus" size={18} className="text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Не задан</p>
              <p className="text-[11px] text-muted-foreground">Адрес дня не установлен — слоты определяют сами</p>
            </div>
            {selected === "clear" && <Icon name="Check" size={16} className="text-primary" />}
          </button>

          {/* Выездной вариант */}
          <button
            onClick={() => setSelected(null)}
            className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
              selected === null ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            }`}
          >
            <Icon name="Car" size={18} className="text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Выезд к гостю</p>
              <p className="text-[11px] text-muted-foreground">Гость укажет адрес при записи</p>
            </div>
            {selected === null && <Icon name="Check" size={16} className="text-primary" />}
          </button>

          {addresses.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              У вас пока нет сохранённых адресов. Добавьте их в разделе «Мои адреса».
            </p>
          ) : (
            addresses.map((a) => {
              const active = selected === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected(a.id ?? null)}
                  className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: a.color || "#94a3b8" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {a.label || a.address_text}
                      {a.is_primary && (
                        <span className="ml-1.5 text-[10px] text-amber-600">основной</span>
                      )}
                    </p>
                    {a.label && (
                      <p className="text-[11px] text-muted-foreground truncate">{a.address_text}</p>
                    )}
                  </div>
                  {active && <Icon name="Check" size={16} className="text-primary shrink-0" />}
                </button>
              );
            })
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Отмена
            </Button>
            <Button
              className="flex-1 gap-1.5"
              onClick={() => onSave(selected)}
              disabled={saving}
            >
              {saving && <Icon name="Loader2" size={15} className="animate-spin" />}
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
