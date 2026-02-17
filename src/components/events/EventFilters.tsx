import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { EventType, EVENT_TYPE_CONFIG, BATH_NAMES } from "@/data/events";

interface EventFiltersProps {
  selectedType: EventType | "all";
  selectedBath: string;
  selectedAvailability: string;
  onTypeChange: (value: EventType | "all") => void;
  onBathChange: (value: string) => void;
  onAvailabilityChange: (value: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export default function EventFilters({
  selectedType,
  selectedBath,
  selectedAvailability,
  onTypeChange,
  onBathChange,
  onAvailabilityChange,
  onReset,
  hasActiveFilters,
}: EventFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedType} onValueChange={(v) => onTypeChange(v as EventType | "all")}>
        <SelectTrigger className="w-[180px] rounded-full bg-card border-0 shadow-sm">
          <SelectValue placeholder="Тип события" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все типы</SelectItem>
          {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedBath} onValueChange={onBathChange}>
        <SelectTrigger className="w-[180px] rounded-full bg-card border-0 shadow-sm">
          <SelectValue placeholder="Баня" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все бани</SelectItem>
          {BATH_NAMES.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedAvailability} onValueChange={onAvailabilityChange}>
        <SelectTrigger className="w-[180px] rounded-full bg-card border-0 shadow-sm">
          <SelectValue placeholder="Наличие мест" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          <SelectItem value="available">Есть места</SelectItem>
          <SelectItem value="few">Мало мест</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={onReset}>
          <Icon name="X" size={14} className="mr-1" />
          Сбросить
        </Button>
      )}
    </div>
  );
}
