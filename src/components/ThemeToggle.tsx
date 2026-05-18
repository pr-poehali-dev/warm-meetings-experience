import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

type Mode = "light" | "dark" | "system";

const MODES: { value: Mode; icon: string; label: string }[] = [
  { value: "light", icon: "Sun",    label: "Светлая" },
  { value: "system", icon: "Monitor", label: "Системная" },
  { value: "dark",  icon: "Moon",   label: "Тёмная" },
];

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = (theme as Mode) ?? "system";

  if (compact) {
    const next: Record<Mode, Mode> = { light: "dark", dark: "system", system: "light" };
    const icons: Record<Mode, string> = { light: "Sun", dark: "Moon", system: "Monitor" };
    return (
      <button
        onClick={() => setTheme(next[current])}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{ background: "var(--glass-bg, rgba(255,255,255,0.1))", border: "1px solid var(--glass-border, rgba(0,0,0,0.1))" }}
        title={MODES.find(m => m.value === current)?.label}
      >
        <Icon name={icons[current] as "Sun"} size={15} style={{ color: "var(--c-terra, #C8834A)" } as React.CSSProperties} />
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-full p-1"
      style={{ background: "var(--toggle-bg, rgba(0,0,0,0.06))", border: "1px solid var(--glass-border, rgba(0,0,0,0.08))" }}
    >
      {MODES.map((m) => {
        const active = current === m.value;
        return (
          <button
            key={m.value}
            onClick={() => setTheme(m.value)}
            title={m.label}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
            style={active
              ? { background: "rgba(200,131,74,0.25)", color: "#C8834A" }
              : { color: "var(--c-muted, rgba(0,0,0,0.45))" }
            }
          >
            <Icon name={m.icon as "Sun"} size={13} />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
