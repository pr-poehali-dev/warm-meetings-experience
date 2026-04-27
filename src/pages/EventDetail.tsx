import { useParams, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import SignUpForm from "@/components/events/SignUpForm";
import { EventItem, mapApiEvent, getTypeColors } from "@/data/events";
import { eventsApi } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import Header from "@/components/Header";
import DynamicPricingBlock from "@/components/events/DynamicPricingBlock";

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    eventsApi.getBySlug(slug).then((data) => {
      setEvent(mapApiEvent(data));
      setLoading(false);
    }).catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, [slug]);

  if (notFound) return <Navigate to="/events" replace />;

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  const typeColors = getTypeColors(event.type);
  const dateObj = parseISO(event.date);
  const spotsColor =
    event.spotsLeft === 0
      ? "text-red-600 bg-red-50"
      : event.spotsLeft <= 2
        ? "text-orange-600 bg-orange-50"
        : "text-green-600 bg-green-50";

  const spotsLabel =
    event.spotsLeft === 0
      ? "Мест нет"
      : event.spotsLeft <= 2
        ? `Последние ${event.spotsLeft} места`
        : `Осталось ${event.spotsLeft} из ${event.totalSpots} мест`;

  const priceDisplay = event.pricingType === "dynamic" && event.pricingTiers?.length
    ? null
    : event.priceLabel || null;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <Header />

      {/* Hero */}
      {event.image ? (
        <div className="relative h-64 md:h-96 overflow-hidden">
          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-0 right-0 container mx-auto px-4 sm:px-6 lg:px-8">
            <span className={`inline-block text-xs px-3 py-1.5 rounded-full font-medium ${typeColors.bg} ${typeColors.color} mb-3`}>
              {event.type}
            </span>
            <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">{event.title}</h1>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
          <span className={`inline-block text-xs px-3 py-1.5 rounded-full font-medium ${typeColors.bg} ${typeColors.color} mb-3`}>
            {event.type}
          </span>
          <h1 className="text-2xl md:text-4xl font-bold">{event.title}</h1>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Основной контент */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* Мета-инфо */}
            <div className="flex flex-wrap gap-5">
              <MetaItem icon="Calendar" label={format(dateObj, "d MMMM yyyy, EEEE", { locale: ru })} sub={`${event.timeStart} — ${event.timeEnd}`} />
              {event.bathName && (
                <MetaItem icon="MapPin" label={event.bathName} sub={event.bathAddress} />
              )}
              {event.totalSpots > 0 && (
                <MetaItem icon="Users" label={`${event.totalSpots} мест`} sub={spotsLabel} subColor={event.spotsLeft === 0 ? "text-red-500" : event.spotsLeft <= 2 ? "text-orange-500" : "text-green-600"} />
              )}
            </div>

            {/* Описание */}
            {event.fullDescription && (
              <section>
                <h2 className="text-xl font-semibold mb-3">О встрече</h2>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.fullDescription}</div>
              </section>
            )}

            {/* Программа */}
            {event.program.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Программа</h2>
                <div className="space-y-2.5">
                  {event.program.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-accent">{i + 1}</span>
                      </div>
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Правила */}
            {event.rules.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Правила</h2>
                <Card className="border shadow-sm">
                  <CardContent className="p-5">
                    <ul className="space-y-3">
                      {event.rules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Icon name="Shield" size={15} className="text-accent mt-0.5 shrink-0" />
                          <span className="text-muted-foreground text-sm">{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>

          {/* Десктопная боковая панель */}
          <div className="hidden lg:block lg:w-[340px] shrink-0">
            <div className="sticky top-24 space-y-4">
              <SidebarCard
                event={event}
                spotsColor={spotsColor}
                spotsLabel={spotsLabel}
                priceDisplay={priceDisplay}
                dateObj={dateObj}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Мобильная sticky-панель снизу */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {priceDisplay && (
              <div className="text-lg font-bold text-accent leading-tight">{priceDisplay}</div>
            )}
            {event.totalSpots > 0 && (
              <div className={`text-xs font-medium ${event.spotsLeft === 0 ? "text-red-500" : event.spotsLeft <= 2 ? "text-orange-500" : "text-green-600"}`}>
                {spotsLabel}
              </div>
            )}
          </div>
          {event.id && (
            <SignUpForm
              eventId={event.id}
              eventTitle={event.title}
              spotsLeft={event.spotsLeft}
              priceLabel={priceDisplay ?? undefined}
              eventDate={event.date}
              timeStart={event.timeStart}
              timeEnd={event.timeEnd}
              bathName={event.bathName}
              totalSpots={event.totalSpots}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Мета-иконка с подписью ─────────────────────────────────────────── */
function MetaItem({ icon, label, sub, subColor }: { icon: string; label: string; sub?: string; subColor?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
        <Icon name={icon as "Calendar"} size={15} className="text-accent" />
      </div>
      <div>
        <div className="font-medium">{label}</div>
        {sub && <div className={`text-xs ${subColor ?? "text-muted-foreground"}`}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Десктопный сайдбар ─────────────────────────────────────────────── */
function SidebarCard({ event, spotsColor, spotsLabel, priceDisplay, dateObj }: {
  event: EventItem;
  spotsColor: string;
  spotsLabel: string;
  priceDisplay: string | null;
  dateObj: Date;
}) {
  return (
    <>
      <Card className="border shadow-sm">
        <CardContent className="p-5 space-y-4">
          {/* Цена */}
          {event.pricingType === "dynamic" && event.pricingTiers?.length ? (
            <DynamicPricingBlock tiers={event.pricingTiers} />
          ) : (
            <>
              {priceDisplay && (
                <div className="text-3xl font-bold text-accent">{priceDisplay}</div>
              )}
              {event.pricingLines && event.pricingLines.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Стоимость участия</div>
                  <ul className="space-y-1.5">
                    {event.pricingLines.map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="shrink-0 mt-0.5">🔹</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Места */}
          {event.totalSpots > 0 && (
            <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${spotsColor}`}>
              <Icon name="Users" size={11} />
              {spotsLabel}
            </div>
          )}

          {/* Дата и место */}
          <div className="space-y-2 text-sm text-muted-foreground pt-1 border-t border-border">
            <div className="flex items-center gap-2">
              <Icon name="Calendar" size={13} />
              {format(dateObj, "d MMMM", { locale: ru })}, {event.timeStart}–{event.timeEnd}
            </div>
            {event.bathName && (
              <div className="flex items-center gap-2">
                <Icon name="MapPin" size={13} />
                {event.bathName}
              </div>
            )}
          </div>

          {/* Кнопка */}
          {event.id && (
            <SignUpForm
              eventId={event.id}
              eventTitle={event.title}
              spotsLeft={event.spotsLeft}
              priceLabel={priceDisplay ?? undefined}
              eventDate={event.date}
              timeStart={event.timeStart}
              timeEnd={event.timeEnd}
              bathName={event.bathName}
              totalSpots={event.totalSpots}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}