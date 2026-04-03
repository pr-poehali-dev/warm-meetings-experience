import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";
import EventCard from "@/components/events/EventCard";
import { EventItem } from "@/data/events";
import { TELEGRAM_URL } from "@/lib/constants";

interface UpcomingEventsSectionProps {
  events: EventItem[];
}

export default function UpcomingEventsSection({ events }: UpcomingEventsSectionProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const checkScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [events]);

  const scroll = (dir: "prev" | "next") => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]") as HTMLElement;
    const step = card ? card.offsetWidth + 24 : 320;
    el.scrollBy({ left: dir === "next" ? step : -step, behavior: "smooth" });
    setTimeout(checkScroll, 350);
  };

  return (
    <section className="py-24 md:py-32 bg-accent/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Icon name="Calendar" className="text-accent" size={36} />
              <h2 className="text-3xl md:text-4xl font-semibold">Ближайшие встречи</h2>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Банные встречи, мастер-классы и практики — выберите подходящую и запишитесь
            </p>
          </div>
          {events.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => scroll("prev")}
                disabled={!canPrev}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center transition-colors disabled:opacity-30 hover:bg-muted disabled:cursor-default"
              >
                <Icon name="ChevronLeft" size={18} />
              </button>
              <button
                onClick={() => scroll("next")}
                disabled={!canNext}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center transition-colors disabled:opacity-30 hover:bg-muted disabled:cursor-default"
              >
                <Icon name="ChevronRight" size={18} />
              </button>
            </div>
          )}
        </div>

        {events.length > 0 ? (
          <>
            <div
              ref={trackRef}
              onScroll={checkScroll}
              className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {events.map((event) => (
                <div
                  key={event.slug}
                  data-card
                  className="shrink-0 w-[300px] sm:w-[340px] snap-start"
                >
                  <EventCard event={event} />
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link to="/events">
                <Button size="lg" variant="outline" className="rounded-full text-base px-8">
                  <Icon name="CalendarDays" className="mr-2" size={20} />
                  Все встречи и расписание
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="max-w-lg mx-auto text-center py-12 px-8 border border-dashed border-border rounded-2xl bg-card">
            <Icon name="CalendarClock" size={48} className="text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Скоро здесь появятся встречи</h3>
            <p className="text-muted-foreground mb-6">
              Мы готовим новые встречи. Подпишитесь на Telegram-канал, чтобы не пропустить анонс.
            </p>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => window.open(TELEGRAM_URL, "_blank")}
            >
              <Icon name="Send" size={16} className="mr-2" />
              Подписаться на канал
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}