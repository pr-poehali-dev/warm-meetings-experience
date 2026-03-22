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
  return (
    <section className="py-24 md:py-32 bg-accent/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Icon name="Calendar" className="text-accent mx-auto mb-6" size={48} />
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Ближайшие события
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Банные встречи, мастер-классы и практики — выберите подходящее и запишитесь
          </p>
        </div>

        {events.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
              {events.slice(0, 3).map((event) => (
                <EventCard key={event.slug} event={event} />
              ))}
            </div>
            <div className="text-center">
              <Link to="/events">
                <Button size="lg" variant="outline" className="rounded-full text-base px-8">
                  <Icon name="CalendarDays" className="mr-2" size={20} />
                  Все события и расписание
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="max-w-lg mx-auto text-center py-12 px-8 border border-dashed border-border rounded-2xl bg-card">
            <Icon name="CalendarClock" size={48} className="text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Скоро здесь появятся события</h3>
            <p className="text-muted-foreground mb-6">
              Мы готовим новые встречи. Подпишитесь на Telegram-канал, чтобы не пропустить анонс.
            </p>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => window.open(TELEGRAM_URL, '_blank')}
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
