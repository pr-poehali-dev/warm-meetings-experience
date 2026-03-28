import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import EventCard from "@/components/events/EventCard";
import EventFilters from "@/components/events/EventFilters";
import EventCalendar from "@/components/events/EventCalendar";
import { EventItem, mapApiEvent } from "@/data/events";
import { eventsApi } from "@/lib/api";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Link } from "react-router-dom";
import { parseISO, isSameDay } from "date-fns";

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedBath, setSelectedBath] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);
  const [view, setView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    eventsApi.getAll(true).then((data) => {
      setEvents(data.map(mapApiEvent));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const eventTypes = useMemo(() => [...new Set(events.map((e) => e.type))], [events]);
  const bathNames = useMemo(() => [...new Set(events.map((e) => e.bathName).filter(Boolean))], [events]);

  const hasActiveFilters =
    selectedType !== "all" ||
    selectedBath !== "all" ||
    selectedAvailability !== "all" ||
    calendarDate !== undefined;

  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => {
        if (selectedType !== "all" && e.type !== selectedType) return false;
        if (selectedBath !== "all" && e.bathName !== selectedBath) return false;
        if (selectedAvailability === "available" && e.spotsLeft === 0) return false;
        if (selectedAvailability === "few" && (e.spotsLeft === 0 || e.spotsLeft > 3)) return false;
        if (calendarDate && !isSameDay(parseISO(e.date), calendarDate)) return false;
        return true;
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [events, selectedType, selectedBath, selectedAvailability, calendarDate]);

  const resetFilters = () => {
    setSelectedType("all");
    setSelectedBath("all");
    setSelectedAvailability("all");
    setCalendarDate(undefined);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              Афиша встреч
            </h2>
            <p className="text-lg text-muted-foreground">
              Банные встречи, мастер-классы и практики. Выберите подходящую и запишитесь.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Загрузка встреч...</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <EventFilters
                    eventTypes={eventTypes}
                    bathNames={bathNames}
                    selectedType={selectedType}
                    selectedBath={selectedBath}
                    selectedAvailability={selectedAvailability}
                    onTypeChange={setSelectedType}
                    onBathChange={setSelectedBath}
                    onAvailabilityChange={setSelectedAvailability}
                    onReset={resetFilters}
                    hasActiveFilters={hasActiveFilters}
                  />

                  <div className="flex gap-1 bg-muted rounded-full p-1">
                    <button
                      onClick={() => setView("list")}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
                    >
                      <Icon name="List" size={16} className="inline mr-1" />
                      Список
                    </button>
                    <button
                      onClick={() => setView("calendar")}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${view === "calendar" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
                    >
                      <Icon name="CalendarDays" size={16} className="inline mr-1" />
                      Календарь
                    </button>
                  </div>
                </div>

                {view === "list" ? (
                  <>
                    {filteredEvents.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-6">
                        {filteredEvents.map((event) => (
                          <EventCard key={event.slug} event={event} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <Icon name="CalendarX" size={48} className="text-muted-foreground/40 mx-auto mb-4" />
                        <p className="text-muted-foreground text-lg mb-2">Встреч не найдено</p>
                        <p className="text-sm text-muted-foreground mb-4">Попробуйте изменить фильтры</p>
                        <Button variant="outline" className="rounded-full" onClick={resetFilters}>
                          Сбросить фильтры
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="sm:col-span-1">
                      <EventCalendar
                        events={events}
                        selectedDate={calendarDate}
                        onDateSelect={setCalendarDate}
                      />
                    </div>
                    <div className="sm:col-span-1 lg:col-span-2">
                      {filteredEvents.length > 0 ? (
                        <div className="space-y-4">
                          {filteredEvents.map((event) => (
                            <EventCard key={event.slug} event={event} compact />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            {calendarDate ? "Нет встреч на эту дату" : "Выберите дату в календаре"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </section>

      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
            <div>
              <h3 className="text-xl font-semibold mb-1">Хотите провести свою встречу?</h3>
              <p className="text-muted-foreground">Станьте организатором — создавайте события и собирайте свою аудиторию</p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link to="/organizer">
                <Icon name="CalendarPlus" size={16} />
                Провести свою встречу
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}