import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { format, parseISO, isValid } from "date-fns";
import { ru } from "date-fns/locale";

interface PreviewData {
  title: string;
  short_description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  event_type: string;
  event_type_icon: string;
  image_url: string;
  bath_name?: string;
  price_label?: string;
  price_amount?: number;
  total_spots?: number;
  spots_left?: number;
  occupancy?: string;
}

interface EventPreviewCardProps {
  data: PreviewData;
}

const occupancyColor = (occ: string) => {
  switch (occ) {
    case "low": return "text-green-600";
    case "medium": return "text-yellow-600";
    case "high": return "text-orange-600";
    case "full": return "text-red-600";
    default: return "text-green-600";
  }
};

const spotsText = (spots_left?: number) => {
  if (spots_left === undefined || spots_left === null) return null;
  if (spots_left === 0) return { text: "Мест нет", color: "text-red-600" };
  if (spots_left <= 2) return { text: `Осталось ${spots_left}`, color: "text-orange-600" };
  return { text: `Осталось ${spots_left}`, color: "text-green-600" };
};

export default function EventPreviewCard({ data }: EventPreviewCardProps) {
  const hasDate = data.event_date && data.event_date.length >= 10;
  let dateStr = "";
  if (hasDate) {
    try {
      const d = parseISO(data.event_date);
      if (isValid(d)) dateStr = format(d, "d MMMM, EEEE", { locale: ru });
    } catch (_e) {
      dateStr = "";
    }
  }

  const priceDisplay = data.price_label || (data.price_amount ? `${data.price_amount.toLocaleString("ru-RU")} ₽` : "");
  const spots = spotsText(data.spots_left);
  const typeLabel = data.event_type || "Знакомство";
  const typeIcon = data.event_type_icon || "Users";

  return (
    <div className="sticky top-20">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Предпросмотр карточки</p>
      <Card className="bg-card border shadow-md overflow-hidden max-w-sm">
        {data.image_url ? (
          <div className="relative h-44 overflow-hidden">
            <img
              src={data.image_url}
              alt={data.title || "Мероприятие"}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3">
              <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-white/90 text-gray-700 flex items-center gap-1">
                <Icon name={typeIcon} size={12} />
                {typeLabel}
              </span>
            </div>
            {spots && (
              <div className="absolute top-3 right-3">
                <span className={`text-xs px-3 py-1.5 rounded-full font-medium bg-white/90 ${spots.color}`}>
                  {spots.text}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="h-44 bg-muted flex items-center justify-center relative">
            <Icon name="Image" size={40} className="text-muted-foreground/40" />
            <div className="absolute top-3 left-3">
              <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-background/80 text-muted-foreground flex items-center gap-1">
                <Icon name={typeIcon} size={12} />
                {typeLabel}
              </span>
            </div>
            {spots && (
              <div className="absolute top-3 right-3">
                <span className={`text-xs px-3 py-1.5 rounded-full font-medium bg-background/80 ${spots.color}`}>
                  {spots.text}
                </span>
              </div>
            )}
          </div>
        )}

        <CardContent className="p-5">
          {(dateStr || data.start_time) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2.5">
              {dateStr && (
                <span className="flex items-center gap-1">
                  <Icon name="Calendar" size={12} />
                  {dateStr}
                </span>
              )}
              {data.start_time && (
                <span className="flex items-center gap-1">
                  <Icon name="Clock" size={12} />
                  {data.start_time}{data.end_time ? ` — ${data.end_time}` : ""}
                </span>
              )}
            </div>
          )}

          <h3 className="text-base font-semibold mb-1.5 line-clamp-2">
            {data.title || <span className="text-muted-foreground italic">Название мероприятия</span>}
          </h3>

          {data.short_description && (
            <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{data.short_description}</p>
          )}

          {data.bath_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Icon name="MapPin" size={12} />
              <span>{data.bath_name}</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            {priceDisplay ? (
              <div className="text-base font-semibold text-primary">{priceDisplay}</div>
            ) : (
              <div />
            )}
            <Button size="sm" className="rounded-full text-xs h-8 px-4">
              Подробнее
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Так карточка будет выглядеть в каталоге
      </p>
    </div>
  );
}