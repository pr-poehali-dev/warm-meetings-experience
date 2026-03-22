import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PrinciplesPreview from "@/components/PrinciplesPreview";
import { EventItem, mapApiEvent } from "@/data/events";
import { eventsApi } from "@/lib/api";
import Footer from "@/components/Footer";
import HeroSection from "@/components/sections/HeroSection";
import FormatSection from "@/components/sections/FormatSection";
import AudienceSection from "@/components/sections/AudienceSection";
import UpcomingEventsSection from "@/components/sections/UpcomingEventsSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import RulesSection from "@/components/sections/RulesSection";
import FAQSection from "@/components/sections/FAQSection";
import OrganizerCTASection from "@/components/sections/OrganizerCTASection";
import FinalCTASection from "@/components/sections/FinalCTASection";

export default function Index() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    eventsApi.getAll(true).then((data) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = data.map(mapApiEvent).filter((e) => new Date(e.date) >= today);
      setEvents(upcoming);
    }).catch(() => {});
  }, []);

  const scrollDown = () => {
    window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50">
        <Link
          to={user ? "/account" : "/login"}
          className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full hover:bg-white/20 transition-colors text-sm font-medium"
        >
          <Icon name={user ? "User" : "LogIn"} size={16} />
          <span className="hidden sm:inline">{user ? user.name : "Войти"}</span>
        </Link>
      </div>

      <HeroSection user={user} onScrollDown={scrollDown} />
      <FormatSection />
      <AudienceSection />
      <PrinciplesPreview />
      <UpcomingEventsSection events={events} />
      <HowItWorksSection />
      <RulesSection />
      <FAQSection />
      <OrganizerCTASection />
      <FinalCTASection />
      <Footer />
    </div>
  );
}
