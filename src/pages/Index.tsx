import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { eventsApi } from "@/lib/api";
import { EventItem, mapApiEvent } from "@/data/events";
import { startOfDay, parseISO } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { THEME_STYLES } from "./index/IndexShared";
import IndexHeroSection from "./index/IndexHeroSection";
import IndexInfoSections from "./index/IndexInfoSections";
import IndexReviewsFaq from "./index/IndexReviewsFaq";

export default function Index() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const [view, setView] = useState<"grid" | "list" | "calendar">("grid");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    eventsApi.getAll(true).then((data) => {
      const today = startOfDay(new Date());
      setEvents(data.map(mapApiEvent).filter((e) => parseISO(e.date) >= today));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const eventTypes = useMemo(() => ["all", ...Array.from(new Set(events.map((e) => e.type)))], [events]);

  const filtered = useMemo(() => {
    return events
      .filter((e) => selectedType === "all" || e.type === selectedType)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [events, selectedType]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />
      <div
        data-sparcom-theme={isDark ? "dark" : "light"}
        className="min-h-screen relative overflow-x-hidden transition-colors duration-500"
        style={{ background: "var(--bg-page)" }}
      >
        {/* Ambient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute rounded-full blur-3xl" style={{ width: 700, height: 700, top: -200, left: -200, background: `radial-gradient(circle, var(--orb1), transparent 70%)` }} />
          <div className="absolute rounded-full blur-3xl" style={{ width: 600, height: 600, top: 100, right: -150, background: `radial-gradient(circle, var(--orb2), transparent 70%)` }} />
          <div className="absolute rounded-full blur-3xl" style={{ width: 500, height: 500, bottom: 0, left: "35%", background: `radial-gradient(circle, var(--orb3), transparent 70%)` }} />
        </div>

        <Header transparent />

        <IndexHeroSection
          events={events}
          filtered={filtered}
          loading={loading}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          view={view}
          setView={setView}
          eventTypes={eventTypes}
          calendarDate={calendarDate}
          setCalendarDate={setCalendarDate}
        />

        <IndexInfoSections />

        <IndexReviewsFaq />

        <Footer />
      </div>
    </>
  );
}
