import { useState } from "react";
import Icon from "@/components/ui/icon";
import DonationModal from "@/components/club/DonationModal";

interface SupportHeartButtonProps {
  variant?: "default" | "transparent";
  source?: string;
}

export default function SupportHeartButton({
  variant = "default",
  source = "header",
}: SupportHeartButtonProps) {
  const [open, setOpen] = useState(false);

  const colors =
    variant === "transparent"
      ? "text-white/90 hover:text-white hover:bg-white/10"
      : "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
