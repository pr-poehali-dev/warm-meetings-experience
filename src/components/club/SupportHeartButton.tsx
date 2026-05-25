import Icon from "@/components/ui/icon";

const SBER_URL = "https://messenger.online.sberbank.ru/sl/9eE3EK9SoMLSsYC2x";

interface SupportHeartButtonProps {
  variant?: "default" | "transparent" | "row";
  source?: string;
  label?: string;
  onBeforeOpen?: () => void;
}

export default function SupportHeartButton({
  variant = "default",
  label,
  onBeforeOpen,
}: SupportHeartButtonProps) {
  if (variant === "row") {
    return (
      <a
        href={SBER_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onBeforeOpen?.()}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <span className="flex items-center gap-3">
          <Icon name="Heart" size={18} className="text-emerald-500" />
          {label ?? "Поддержать клуб"}
        </span>
        <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
      </a>
    );
  }

  const colors =
    variant === "transparent"
      ? "text-white/90 hover:text-white hover:bg-white/10"
      : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20";

  return (
    <a
      href={SBER_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onBeforeOpen?.()}
      title="Поддержать клуб"
      aria-label="Поддержать клуб"
      className={`p-2 rounded-full transition-colors ${colors}`}
    >
      <Icon name="Heart" size={20} />
    </a>
  );
}
