import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";

interface SignUpDialogHeaderProps {
  eventTitle: string;
  dateLabel: string | null;
  timeLabel: string | undefined;
  bathName?: string;
  priceLabel?: string;
  totalSpots?: number;
  spotsLeft: number;
  filledSpots: number;
  fillPercent: number;
}

export default function SignUpDialogHeader({
  eventTitle,
  dateLabel,
  timeLabel,
  bathName,
  priceLabel,
  totalSpots,
  spotsLeft,
  filledSpots,
  fillPercent,
}: SignUpDialogHeaderProps) {
  return (
    <DialogHeader className="px-5 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b shrink-0">
      <DialogTitle className="text-sm sm:text-base font-semibold leading-tight pr-6">
        Запись на «{eventTitle}»
      </DialogTitle>
      {(dateLabel || timeLabel || bathName) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1 sm:mt-2">
          {dateLabel && (
            <span className="inline-flex items-center gap-1">
              <Icon name="Calendar" size={12} />
              {dateLabel}
            </span>
          )}
          {timeLabel && (
            <span className="inline-flex items-center gap-1">
              <Icon name="Clock" size={12} />
              {timeLabel}
            </span>
          )}
          {bathName && (
            <span className="hidden sm:inline-flex items-center gap-1">
              <Icon name="MapPin" size={12} />
              {bathName}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 mt-1 sm:mt-1.5">
        {priceLabel && (
          <p className="text-sm font-medium text-accent">{priceLabel}</p>
        )}
        {totalSpots && totalSpots > 0 ? (
          <span className={`text-xs font-medium shrink-0 ${spotsLeft <= 2 ? "text-orange-600" : "text-green-600"}`}>
            {spotsLeft <= 2 ? `Осталось ${spotsLeft}!` : `Осталось ${spotsLeft}`}
          </span>
        ) : null}
      </div>

      {totalSpots && totalSpots > 0 ? (
        <div className="mt-1.5">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${spotsLeft <= 2 ? "bg-orange-500" : "bg-green-500"}`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>
      ) : null}
    </DialogHeader>
  );
}