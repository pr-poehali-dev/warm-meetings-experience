import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";

/* ─── spotsColor helper ─── */

export function spotsColor(left: number) {
  if (left === 0) return "text-red-600 bg-red-50";
  if (left <= 2) return "text-orange-600 bg-orange-50";
  return "text-green-600 bg-green-50";
}

/* ─── InlineText ─── */

interface InlineTextProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  multiline?: boolean;
  maxLength?: number;
  inputClassName?: string;
  hint?: string;
}

export function InlineText({
  value,
  onChange,
  placeholder,
  className = "",
  multiline,
  maxLength,
  inputClassName = "",
  hint,
}: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (editing) {
    const sharedProps = {
      ref,
      value,
      maxLength,
      className: `w-full bg-white/90 border-2 border-primary/60 rounded-md px-2 py-1 outline-none focus:border-primary shadow-sm ${inputClassName}`,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange(e.target.value),
      onBlur: () => setEditing(false),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          setEditing(false);
        }
        if (e.key === "Escape") setEditing(false);
      },
    };
    return (
      <div className="relative">
        {multiline ? (
          <textarea {...sharedProps} rows={4} />
        ) : (
          <input {...sharedProps} type="text" />
        )}
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Нажмите, чтобы изменить"
      className={`group relative cursor-text rounded-md transition-all hover:ring-2 hover:ring-primary/30 hover:bg-primary/5 ${className}`}
    >
      {value ? (
        <span>{value}</span>
      ) : (
        <span className="text-muted-foreground/60 italic">{placeholder}</span>
      )}
      <Icon
        name="Pencil"
        size={11}
        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-60 text-primary transition-opacity"
      />
    </div>
  );
}

/* ─── InlineList ─── */

interface InlineListProps {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  icon: string;
}

export function InlineList({ items, onChange, placeholder, icon }: InlineListProps) {
  const [editing, setEditing] = useState(false);
  const text = items.filter(Boolean).join("\n");

  if (editing) {
    return (
      <div>
        <Textarea
          autoFocus
          defaultValue={text}
          rows={5}
          className="text-sm"
          placeholder={placeholder}
          onBlur={(e) => {
            onChange(e.target.value.split("\n").filter(Boolean));
            setEditing(false);
          }}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Каждый пункт с новой строки. Кликните вне поля — сохранит.
        </p>
      </div>
    );
  }

  if (!items.filter(Boolean).length) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-muted-foreground/60 italic hover:text-primary transition-colors flex items-center gap-1.5 py-1"
      >
        <Icon name="Plus" size={13} />
        {placeholder}
      </button>
    );
  }

  return (
    <div
      className="group cursor-text rounded-md hover:bg-primary/5 hover:ring-2 hover:ring-primary/30 transition-all p-1 -m-1"
      onClick={() => setEditing(true)}
    >
      <div className="space-y-1.5">
        {items.filter(Boolean).map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-5 h-5 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              {icon === "num" ? (
                <span className="text-xs font-medium text-accent">{i + 1}</span>
              ) : (
                <Icon name={icon} size={11} className="text-accent" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-60 transition-opacity">
        <Icon name="Pencil" size={11} className="text-primary" />
        <span className="text-xs text-primary">Редактировать</span>
      </div>
    </div>
  );
}

/* ─── InlinePricingLines ─── */

interface InlinePricingLinesProps {
  lines: string[];
  onChange: (v: string[]) => void;
}

export function InlinePricingLines({ lines, onChange }: InlinePricingLinesProps) {
  const [editing, setEditing] = useState(false);
  const text = lines.filter(Boolean).join("\n");

  if (editing) {
    return (
      <div>
        <Textarea
          autoFocus
          defaultValue={text}
          rows={4}
          className="text-sm"
          placeholder={"5 000 ₽ — ранняя бронь\n6 000 ₽ — обычная цена"}
          onBlur={(e) => {
            onChange(e.target.value.split("\n"));
            setEditing(false);
          }}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Каждая строка — отдельный пункт стоимости.
        </p>
      </div>
    );
  }

  if (!lines.filter(Boolean).length) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-muted-foreground/60 italic hover:text-primary transition-colors flex items-center gap-1.5"
      >
        <Icon name="Plus" size={13} /> Добавить описание стоимости
      </button>
    );
  }

  return (
    <div
      className="group cursor-text rounded hover:bg-primary/5 hover:ring-2 hover:ring-primary/30 transition-all p-1 -m-1"
      onClick={() => setEditing(true)}
    >
      <ul className="space-y-1">
        {lines.filter(Boolean).map((line, i) => (
          <li key={i} className="flex items-start gap-1.5 text-sm text-foreground">
            <span className="flex-shrink-0">🔹</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-60 transition-opacity">
        <Icon name="Pencil" size={11} className="text-primary" />
        <span className="text-xs text-primary">Редактировать</span>
      </div>
    </div>
  );
}
