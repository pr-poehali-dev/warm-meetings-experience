import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import FloatingMenu from '@/components/FloatingMenu';
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
      <Link 
        to="/admin"
        className="fixed bottom-8 right-8 z-50 bg-nature-moss text-white p-4 rounded-full shadow-lg hover:bg-nature-moss/90 transition-all hover:scale-110"
        title="Админ-панель"
      >
        <Icon name="Settings" size={24} />
      </Link>
      
      <FloatingMenu />
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