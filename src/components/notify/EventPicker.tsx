import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Icon from "@/components/ui/icon";

export interface EventPickerItem {
  id: number;
  title: string;
  event_date: string | null;
  start_time?: string | null;
  bath_name?: string | null;
  image_url?: string | null;
  signups_count?: number;
}

interface Props {
  events: EventPickerItem[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function initials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function guestsLabel(n: number | undefined | null): string {
  const v = n ?? 0;
  const m10 = v % 10;
  const m100 = v % 100;
  if (m100 >= 11 && m100 <= 14) return `${v} гостей`;
  if (m10 === 1) return `${v} гость`;
  if (m10 >= 2 && m10 <= 4) return `${v} гостя`;
  return `${v} гостей`;
}

function Row({ ev, active }: { ev: EventPickerItem; active?: boolean }) {
  const count = ev.signups_count ?? 0;
  return (
    <div className="flex items-center gap-3 min-w-0 w-full">
      <Avatar className="h-10 w-10 rounded-lg shrink-0 ring-1 ring-border">
        {ev.image_url ? <AvatarImage src={ev.image_url} alt="" className="object-cover" /> : null}
        <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
          {initials(ev.title)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 text-left">
        <div className={`text-sm font-medium truncate ${active ? "text-primary" : ""}`}>{ev.title}</div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
          {ev.event_date && (
            <span className="inline-flex items-center gap-1">
              <Icon name="Calendar" size={11} />
              {formatDate(ev.event_date)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Icon name="Users" size={11} />
            {guestsLabel(count)}
          </span>
          {ev.bath_name && (
            <span className="inline-flex items-center gap-1 truncate">
              <span className="opacity-50">·</span>
              <span className="truncate">{ev.bath_name}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventPicker({ events, value, onChange, placeholder = "Выберите событие" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = events.find((e) => e.id === value) || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-auto min-h-[52px] rounded-xl border bg-background px-3 py-2 text-left transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {selected ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <Row ev={selected} active />
              </div>
              <Icon name="ChevronDown" size={14} className="text-muted-foreground shrink-0" />
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{placeholder}</span>
              <Icon name="ChevronDown" size={14} />
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-1 w-[--radix-popover-trigger-width] max-h-[60vh] overflow-y-auto" align="start">
        {events.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">Событий пока нет</div>
        ) : (
          <ul className="space-y-0.5">
            {events.map((ev) => {
              const active = ev.id === value;
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(ev.id); setOpen(false); }}
                    className={`w-full flex items-center gap-2 rounded-lg p-2 transition-colors text-left ${
                      active ? "bg-primary/10" : "hover:bg-muted"
                    }`}
                  >
                    <Row ev={ev} active={active} />
                    {active && <Icon name="Check" size={14} className="text-primary shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
