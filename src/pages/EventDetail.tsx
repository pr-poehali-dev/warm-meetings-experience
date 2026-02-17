import { useParams, Link, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import SignUpForm from "@/components/events/SignUpForm";
import { EventItem, mapApiEvent, getTypeColors } from "@/data/events";
import { eventsApi } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/events" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="ArrowLeft" size={20} />
            <span className="text-sm font-medium">Все события</span>
          </Link>
          <div className="w-20" />
        </div>
      </header>

      {event.image ? (
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-0 right-0 container mx-auto px-4 sm:px-6 lg:px-8">
            <span className={`inline-block text-xs px-3 py-1.5 rounded-full font-medium ${typeColors.bg} ${typeColors.color} mb-3`}>
              {event.type}
            </span>
            <h1 className="text-2xl md:text-4xl font-bold text-white">{event.title}</h1>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <span className={`inline-block text-xs px-3 py-1.5 rounded-full font-medium ${typeColors.bg} ${typeColors.color} mb-3`}>
            {event.type}
          </span>
          <h1 className="text-2xl md:text-4xl font-bold">{event.title}</h1>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                  <Icon name="Calendar" size={16} className="text-accent" />
                </div>
                <div>
                  <div className="font-medium">{format(dateObj, "d MMMM yyyy, EEEE", { locale: ru })}</div>
                  <div className="text-muted-foreground">{event.timeStart} — {event.timeEnd}</div>
                </div>
              </div>
              {event.bathName && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                    <Icon name="MapPin" size={16} className="text-accent" />
                  </div>
                  <div>
                    <div className="font-medium">{event.bathName}</div>
                    {event.bathAddress && <div className="text-muted-foreground">{event.bathAddress}</div>}
                  </div>
                </div>
              )}
              {event.totalSpots > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                    <Icon name="Users" size={16} className="text-accent" />
                  </div>
                  <div>
                    <div className="font-medium">{event.totalSpots} мест</div>
                    <div className={`font-medium ${event.spotsLeft === 0 ? "text-red-600" : event.spotsLeft <= 2 ? "text-orange-600" : "text-green-600"}`}>
                      {event.spotsLeft === 0 ? "Все заняты" : `Свободно ${event.spotsLeft}`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {event.fullDescription && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">О событии</h2>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.fullDescription}</div>
              </div>
            )}

            {event.program.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Программа</h2>
                <div className="space-y-3">
                  {event.program.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-accent">{i + 1}</span>
                      </div>
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.rules.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Правила</h2>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <ul className="space-y-3">
                      {event.rules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Icon name="Shield" size={16} className="text-accent mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="lg:w-[360px] flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  {event.priceLabel && (
                    <div className="text-3xl font-bold text-accent mb-1">{event.priceLabel}</div>
                  )}
                  {event.totalSpots > 0 && (
                    <div className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${spotsColor} mb-4`}>
                      {event.spotsLeft === 0
                        ? "Мест нет"
                        : event.spotsLeft <= 2
                          ? `Последние ${event.spotsLeft} места`
                          : `Осталось ${event.spotsLeft} из ${event.totalSpots} мест`}
                    </div>
                  )}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Icon name="Calendar" size={14} />
                      {format(dateObj, "d MMMM", { locale: ru })}, {event.timeStart}
                    </div>
                    {event.bathName && (
                      <div className="flex items-center gap-2">
                        <Icon name="MapPin" size={14} />
                        {event.bathName}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {event.id && (
                <SignUpForm eventId={event.id} eventTitle={event.title} spotsLeft={event.spotsLeft} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
