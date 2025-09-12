
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import IndividualConsultations from "./pages/IndividualConsultations";
import GroupPrograms from "./pages/GroupPrograms";
import OnlineCourses from "./pages/OnlineCourses";
import WarmMeetings from "./pages/WarmMeetings";
import WarmTeamBuilding from "./pages/WarmTeamBuilding";
import WarmDates from "./pages/WarmDates";
import Events from "./pages/Events";
import MobileServices from "./pages/MobileServices";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/individual-consultations" element={<IndividualConsultations />} />
          <Route path="/group-programs" element={<GroupPrograms />} />
          <Route path="/online-courses" element={<OnlineCourses />} />
          <Route path="/warm-meetings" element={<WarmMeetings />} />
          <Route path="/warm-team-building" element={<WarmTeamBuilding />} />
          <Route path="/warm-dates" element={<WarmDates />} />
          <Route path="/events" element={<Events />} />
          <Route path="/mobile-services" element={<MobileServices />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;