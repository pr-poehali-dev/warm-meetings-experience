import { useState, useRef, useEffect } from "react";
import Footer from "@/components/Footer";
import {
  OrganizerHero,
  OrganizerCounters,
  OrganizerZeroCommission,
  OrganizerTools,
  OrganizerCabinetPreview,
  OrganizerHowItWorks,
  OrganizerTariffs,
  OrganizerFinalCTA,
} from "./organizer/OrganizerSections";
import {
  OrganizerCalculator,
  OrganizerFAQ,
  OrganizerApplicationForm,
} from "./organizer/OrganizerInteractive";

export default function Organizer() {
  const formRef = useRef<HTMLDivElement>(null);
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

  const [counters, setCounters] = useState({ events: 0, visitors: 0, organizers: 0 });
  useEffect(() => {
    const targets = { events: 120, visitors: 3500, organizers: 24 };
    const duration = 1500;
    const steps = 40;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounters({
        events: Math.round(targets.events * eased),
        visitors: Math.round(targets.visitors * eased),
        organizers: Math.round(targets.organizers * eased),
      });
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <OrganizerHero onScrollToForm={scrollToForm} />
      <OrganizerCounters counters={counters} />
      <OrganizerZeroCommission onScrollToForm={scrollToForm} />
      <OrganizerTools />
      <OrganizerCabinetPreview onScrollToForm={scrollToForm} />
      <OrganizerHowItWorks />
      <OrganizerTariffs onScrollToForm={scrollToForm} />
      <OrganizerCalculator />
      <OrganizerFAQ />
      <OrganizerApplicationForm formRef={formRef} />
      <OrganizerFinalCTA />
      <Footer />
    </div>
  );
}