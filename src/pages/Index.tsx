
import HeroSection from '@/components/sections/HeroSection';
import ManifestoSection from '@/components/sections/ManifestoSection';
import PrinciplesSection from '@/components/sections/PrinciplesSection';
import StatesSection from '@/components/sections/StatesSection';
import SpacePhilosophySection from '@/components/sections/SpacePhilosophySection';
import PersonalStorySection from '@/components/sections/PersonalStorySection';
import AtmosphereGallerySection from '@/components/sections/AtmosphereGallerySection';
import TestimonialsSection from '@/components/sections/TestimonialsSection';
import UpcomingEventsSection from '@/components/sections/UpcomingEventsSection';
import ContactSection from '@/components/sections/ContactSection';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <ManifestoSection />
      <PrinciplesSection />
      <StatesSection />
      <SpacePhilosophySection />
      <PersonalStorySection />
      <AtmosphereGallerySection />
      <TestimonialsSection />
      <UpcomingEventsSection />
      <ContactSection />
    </div>
  );
}