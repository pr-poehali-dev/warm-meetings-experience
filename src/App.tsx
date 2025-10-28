
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import FloatingMenu from "./components/FloatingMenu";
import Footer from "./components/Footer";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import IndividualConsultations from "./pages/IndividualConsultations";
import GroupPrograms from "./pages/GroupPrograms";

import WarmMeetings from "./pages/WarmMeetings";
import WarmTeamBuilding from "./pages/WarmTeamBuilding";
import WarmDates from "./pages/WarmDates";
import Events from "./pages/Events";
import MobileServices from "./pages/MobileServices";
import Admin from "./pages/Admin";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PersonalDataConsent from "./pages/PersonalDataConsent";
import AiPolicy from "./pages/AiPolicy";
import Philosophy from "./pages/Philosophy";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdminPage && <FloatingMenu />}
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/individual-consultations" element={<IndividualConsultations />} />
        <Route path="/group-programs" element={<GroupPrograms />} />

        <Route path="/warm-meetings" element={<WarmMeetings />} />
        <Route path="/warm-team-building" element={<WarmTeamBuilding />} />
        <Route path="/svidanie" element={<WarmDates />} />
        <Route path="/events" element={<Events />} />
        <Route path="/mobile-services" element={<MobileServices />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/personal-data-consent" element={<PersonalDataConsent />} />
        <Route path="/ai-policy" element={<AiPolicy />} />
        <Route path="/philosophy" element={<Philosophy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAdminPage && <Footer />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;