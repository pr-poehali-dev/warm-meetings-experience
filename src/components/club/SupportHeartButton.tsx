import { useState } from "react";
import Icon from "@/components/ui/icon";
import DonationModal from "@/components/club/DonationModal";

interface SupportHeartButtonProps {
  variant?: "default" | "transparent" | "row";
  source?: string;
  label?: string;
  onBeforeOpen?: () => void;
}

export default function SupportHeartButton({
  variant = "default",
  source = "header",
  label,
  onBeforeOpen,
}: SupportHeartButtonProps) {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    onBeforeOpen?.();
    setTimeout(() => setOpen(true), 0);
  };

  if (variant === "row") {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <span className="flex items-center gap-3">
            <Icon name="Heart" size={18} className="text-rose-500" />
            {label ?? "Поддержать клуб"}
          </span>
          <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
        </button>
        <DonationModal open={open} onOpenChange={setOpen} source={source} />
      </>
    );
  }

  const colors =
    variant === "transparent"
      ? "text-white/90 hover:text-white hover:bg-white/10"
      : "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Поддержать клуб"
        aria-label="Поддержать клуб"
        className={`p-2 rounded-full transition-colors ${colors}`}
      >
        <Icon name="Heart" size={20} />
      </button>
      <DonationModal open={open} onOpenChange={setOpen} source={source} />
    </>
  );
}
