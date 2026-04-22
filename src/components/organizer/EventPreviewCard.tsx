import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { format, parseISO, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { getTypeColors } from "@/data/events";
import DynamicPricingBlock from "@/components/events/DynamicPricingBlock";

interface PricingTier {
  label: string;
  price_amount: number;
  valid_until: string | null;
}

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
  bath_address?: string;
  price_label?: string;
  price_amount?: number;
  total_spots?: number;
  spots_left?: number;
  occupancy?: string;
  full_description?: string;
  program?: string[];
  rules?: string[];
  pricing_lines?: string[];
  pricing_type?: "fixed" | "dynamic";
  pricing_tiers?: PricingTier[];
}

interface EventPreviewCardProps {
  data: PreviewData;
}

const spotsText = (spots_left?: number) => {
  if (spots_left === undefined || spots_left === null) return null;
  if (spots_left === 0) return { text: "Мест нет", color: "text-red-600" };
  if (spots_left <= 2)
    return { text: `Осталось ${spots_left}`, color: "text-orange-600" };
  return { text: `Осталось ${spots_left}`, color: "text-green-600" };
};

function CardPreview({ data }: { data: PreviewData }) {
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

  const priceDisplay =
    data.price_label ||
    (data.price_amount ? `${data.price_amount.toLocaleString("ru-RU")} ₽` : "");
  const spots = spotsText(data.spots_left);
  const typeLabel = data.event_type || "Знакомство";
  const typeIcon = data.event_type_icon || "Users";

  return (
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
              <span
                className={`text-xs px-3 py-1.5 rounded-full font-medium bg-white/90 ${spots.color}`}
              >
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
              <span
                className={`text-xs px-3 py-1.5 rounded-full font-medium bg-background/80 ${spots.color}`}
              >
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
                {data.start_time}
                {data.end_time ? ` — ${data.end_time}` : ""}
              </span>
            )}
          </div>
        )}
        <h3 className="text-base font-semibold mb-1.5 line-clamp-2">
          {data.title || (
            <span className="text-muted-foreground italic">
              Название мероприятия
            </span>
          )}
        </h3>
        {data.short_description && (
          <p className="text-muted-foreground text-xs mb-3 line-clamp-2">
            {data.short_description}
          </p>
        )}
        {data.bath_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Icon name="MapPin" size={12} />
            <span>{data.bath_name}</span>
          </div>
        )}
        <div className="flex items-center justify-between mt-3">
          {priceDisplay ? (
            <div className="text-base font-semibold text-primary">
              {priceDisplay}
            </div>
          ) : (
            <div />
          )}
          <Button size="sm" className="rounded-full text-xs h-8 px-4">
            Подробнее
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FullPreview({ data }: { data: PreviewData }) {
  const hasDate = data.event_date && data.event_date.length >= 10;
  let dateObj: Date | null = null;
  if (hasDate) {
    try {
      const d = parseISO(data.event_date);
      if (isValid(d)) dateObj = d;
    } catch (_e) {
      /* ignore parse error */
    }
  }

  const typeLabel = data.event_type || "Знакомство";
  const typeColors = getTypeColors(typeLabel);
  const spots = spotsText(data.spots_left);
  const spotsLeft = data.spots_left ?? 0;
  const totalSpots = data.total_spots ?? 0;

  const spotsColor =
    spotsLeft === 0
      ? "text-red-600 bg-red-50"
      : spotsLeft <= 2
        ? "text-orange-600 bg-orange-50"
        : "text-green-600 bg-green-50";

  const priceDisplay =
    data.price_label ||
    (data.price_amount ? `${data.price_amount.toLocaleString("ru-RU")} ₽` : "");

  return (
    <div className="border rounded-lg overflow-hidden bg-background text-sm">
      {/* Hero */}
      {data.image_url ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={data.image_url}
            alt={data.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <span
              className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${typeColors.bg} ${typeColors.color} mb-1.5`}
            >
              {typeLabel}
            </span>
            <h2 className="text-white font-bold text-base leading-tight">
              {data.title || (
                <span className="italic opacity-70">Название мероприятия</span>
              )}
            </h2>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-muted/40 border-b">
          <span
            className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${typeColors.bg} ${typeColors.color} mb-1.5`}
          >
            {typeLabel}
          </span>
          <h2 className="font-bold text-base leading-tight">
            {data.title || (
              <span className="italic text-muted-foreground">
                Название мероприятия
              </span>
            )}
          </h2>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Meta */}
        <div className="flex flex-wrap gap-3">
          {dateObj && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="Calendar" size={14} className="text-accent" />
              </div>
              <div>
                <div className="font-medium text-xs">
                  {format(dateObj, "d MMMM yyyy, EEEE", { locale: ru })}
                </div>
                {data.start_time && (
                  <div className="text-muted-foreground text-xs">
                    {data.start_time}
                    {data.end_time ? ` — ${data.end_time}` : ""}
                  </div>
                )}
              </div>
            </div>
          )}
          {data.bath_name && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="MapPin" size={14} className="text-accent" />
              </div>
              <div>
                <div className="font-medium text-xs">{data.bath_name}</div>
                {data.bath_address && (
                  <div className="text-muted-foreground text-xs">
                    {data.bath_address}
                  </div>
                )}
              </div>
            </div>
          )}
          {totalSpots > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="Users" size={14} className="text-accent" />
              </div>
              <div>
                <div className="font-medium text-xs">{totalSpots} мест</div>
                {spots && (
                  <div className={`text-xs font-medium ${spots.color}`}>
                    {spots.text}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {data.full_description && (
          <div>
            <h3 className="font-semibold text-sm mb-1.5">О встрече</h3>
            <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-line">
              {data.full_description}
            </p>
          </div>
        )}

        {/* Program */}
        {data.program && data.program.filter(Boolean).length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-1.5">Программа</h3>
            <div className="space-y-2">
              {data.program.filter(Boolean).map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-accent">
                      {i + 1}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rules */}
        {data.rules && data.rules.filter(Boolean).length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-1.5">Правила</h3>
            <div className="space-y-2">
              {data.rules.filter(Boolean).map((rule, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Icon
                    name="Shield"
                    size={13}
                    className="text-accent mt-0.5 flex-shrink-0"
                  />
                  <span className="text-xs text-muted-foreground">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price block */}
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            {data.pricing_type === "dynamic" && data.pricing_tiers?.length ? (
              <div className="mb-3">
                <DynamicPricingBlock tiers={data.pricing_tiers} />
              </div>
            ) : (
              <>
                {priceDisplay && !data.pricing_lines?.length && (
                  <div className="text-2xl font-bold text-accent mb-2">
                    {priceDisplay}
                  </div>
                )}
                {data.pricing_lines &&
                  data.pricing_lines.filter(Boolean).length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-foreground mb-1.5">
                        СТОИМОСТЬ УЧАСТИЯ
                      </div>
                      <ul className="space-y-1">
                        {data.pricing_lines.filter(Boolean).map((line, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-xs text-foreground"
                          >
                            <span className="flex-shrink-0">🔹</span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </>
            )}
            {totalSpots > 0 && (
              <div
                className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${spotsColor} mb-3`}
              >
                {spotsLeft === 0
                  ? "Мест нет"
                  : spotsLeft <= 2
                    ? `Последние ${spotsLeft} места`
                    : `Осталось ${spotsLeft} из ${totalSpots} мест`}
              </div>
            )}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {dateObj && (
                <div className="flex items-center gap-1.5">
                  <Icon name="Calendar" size={13} />
                  {format(dateObj, "d MMMM", { locale: ru })}, {data.start_time}
                </div>
              )}
              {data.bath_name && (
                <div className="flex items-center gap-1.5">
                  <Icon name="MapPin" size={13} />
                  {data.bath_name}
                </div>
              )}
            </div>
            <Button size="sm" className="w-full mt-3 text-xs">
              Записаться
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EventPreviewCard({ data }: EventPreviewCardProps) {
  const [tab, setTab] = useState<"card" | "full">("card");

  return (
    <div className="sticky top-20">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Предпросмотр
      </p>

      {/* Tab switcher */}
      <div className="flex border rounded-lg overflow-hidden mb-3">
        <button
          onClick={() => setTab("card")}
          className={`flex-1 py-1.5 text-xs font-medium transition-colors ${tab === "card" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
        >
          Карточка в каталоге
        </button>
        <button
          onClick={() => setTab("full")}
          className={`flex-1 py-1.5 text-xs font-medium transition-colors ${tab === "full" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
        >
          Полный вид
        </button>
      </div>

      {tab === "card" ? (
        <>
          <CardPreview data={data} />
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Так карточка будет выглядеть в каталоге
          </p>
        </>
      ) : (
        <>
          <FullPreview data={data} />
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Так будет выглядеть страница события
          </p>
        </>
      )}
    </div>
  );
}
