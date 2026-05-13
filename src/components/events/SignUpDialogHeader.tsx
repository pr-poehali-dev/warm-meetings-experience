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
    <DialogHeader className="px-6 pt-6 pb-4 border-b">
      <DialogTitle className="text-base font-semibold leading-tight">
        Запись на «{eventTitle}»
      </DialogTitle>
      {(dateLabel || timeLabel || bathName) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
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
            <span className="inline-flex items-center gap-1">
              <Icon name="MapPin" size={12} />
              {bathName}
            </span>
          )}
        </div>
      )}
      {priceLabel && (
        <p className="text-sm font-medium text-accent mt-1.5">{priceLabel}</p>
      )}

      {totalSpots && totalSpots > 0 ? (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">
              Заполнено {filledSpots} из {totalSpots}
            </span>
            <span className={`font-medium ${spotsLeft <= 2 ? "text-orange-600" : "text-green-600"}`}>
              {spotsLeft <= 2 ? `Осталось ${spotsLeft}!` : `Осталось ${spotsLeft}`}
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
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
