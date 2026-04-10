import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import EventCard from "@/components/events/EventCard";
import { EventItem, mapApiEvent } from "@/data/events";
import { eventsApi } from "@/lib/api";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Link } from "react-router-dom";
import { parseISO, startOfDay, format } from "date-fns";
import { ru } from "date-fns/locale";

export default function PastEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");

  useEffect(() => {
    eventsApi.getAll(true).then((data) => {
      setEvents(data.map(mapApiEvent));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const today = startOfDay(new Date());

  const pastEvents = useMemo(
    () =>
      events
        .filter((e) => parseISO(e.date) < today)
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()),
    [events]
  );

  const eventTypes = useMemo(() => [...new Set(pastEvents.map((e) => e.type))], [pastEvents]);

  const filtered = useMemo(() => {
    if (selectedType === "all") return pastEvents;
    return pastEvents.filter((e) => e.type === selectedType);
  }, [pastEvents, selectedType]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-muted-foreground">
              <Link to="/events">
                <Icon name="ArrowLeft" size={16} />
                Назад к афише
              </Link>
            </Button>
            <h2 className="text-3xl md:text-4xl font-semibold mb-3">Архив встреч</h2>
            <p className="text-lg text-muted-foreground">
              Прошедшие мероприятия — банные встречи, мастер-классы и практики
            </p>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Загрузка архива...</p>
            </div>
          ) : (
            <>
              {eventTypes.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  <button
                    onClick={() => setSelectedType("all")}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selectedType === "all"
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Все
                  </button>
                  {eventTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                        selectedType === type
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="text-center py-20">
                  <Icon name="History" size={48} className="text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">Прошедших встреч пока нет</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-6">
                    {filtered.length} {filtered.length === 1 ? "встреча" : filtered.length < 5 ? "встречи" : "встреч"}
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((event) => (
                      <div key={event.slug} className="opacity-80 hover:opacity-100 transition-opacity">
                        <EventCard event={event} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
