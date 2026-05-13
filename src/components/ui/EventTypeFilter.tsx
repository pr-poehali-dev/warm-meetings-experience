import Icon from "@/components/ui/icon";
import { useEventTypes } from "@/hooks/useEventTypes";

interface Props {
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
}

export default function EventTypeFilter({ value, onChange, allLabel = "Все" }: Props) {
  const { types, loading } = useEventTypes();

  if (loading || types.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onChange("")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
          !value
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-border hover:bg-muted"
        }`}
      >
        {allLabel}
      </button>
      {types.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(value === t.value ? "" : t.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            value === t.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:bg-muted"
          }`}
        >
          <Icon name={t.icon} size={13} fallback="Circle" />
          {t.label}
        </button>
      ))}
    </div>
  );
}
