import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from "@/components/ui/icon";
import EventCard from "@/components/events/EventCard";
import EventFilters from "@/components/events/EventFilters";
import EventCalendar from "@/components/events/EventCalendar";
import { events, EventType } from "@/data/events";
import { parseISO, isSameDay } from "date-fns";

export default function Events() {
  const [selectedType, setSelectedType] = useState<EventType | "all">("all");
  const [selectedBath, setSelectedBath] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);
  const [view, setView] = useState<"list" | "calendar">("list");

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
  }, [selectedType, selectedBath, selectedAvailability, calendarDate]);

  const resetFilters = () => {
    setSelectedType("all");
    setSelectedBath("all");
    setSelectedAvailability("all");
    setCalendarDate(undefined);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="ArrowLeft" size={20} />
            <span className="text-sm font-medium">Главная</span>
          </Link>
          <h1 className="text-lg font-semibold">События</h1>
          <div className="w-20" />
        </div>
      </header>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              Афиша событий
            </h2>
            <p className="text-lg text-muted-foreground">
              Банные встречи, мастер-классы и практики. Выберите подходящее событие и запишитесь.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <EventFilters
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
                      <p className="text-muted-foreground text-lg mb-2">Событий не найдено</p>
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
                          {calendarDate ? "Нет событий на эту дату" : "Выберите дату в календаре"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
