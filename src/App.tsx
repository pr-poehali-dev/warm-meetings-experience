
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Documents from "./pages/Documents";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Principles from "./pages/Principles";
import Organizer from "./pages/Organizer";
import Blog from "./pages/Blog";
import BlogCategory from "./pages/BlogCategory";
import BlogArticle from "./pages/BlogArticle";
import SteamMasterGuide from "./pages/SteamMasterGuide";
import Baths from "./pages/Baths";
import BathDetail from "./pages/BathDetail";
import Masters from "./pages/Masters";
import MasterDetail from "./pages/MasterDetail";
import About from "./pages/About";
import OrganizerCabinet from "./pages/OrganizerCabinet";
import InviteRegister from "./pages/InviteRegister";
import InviteVerify from "./pages/InviteVerify";
import PastEvents from "./pages/PastEvents";
import VkCallback from "./pages/VkCallback";
import YandexCallback from "./pages/YandexCallback";
import VerifyEmail from "./pages/VerifyEmail";
import Functional from "./pages/Functional";
import AccountDemo from "./pages/AccountDemo";
import EventsDemo from "./pages/EventsDemo";

const queryClient = new QueryClient();

const AppContent = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/past" element={<PastEvents />} />
        <Route path="/events/:slug" element={<EventDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/vk/callback" element={<VkCallback />} />
        <Route path="/auth/yandex/callback" element={<YandexCallback />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/register" element={<Register />} />
        <Route path="/account" element={<Account />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/organizer-cabinet" element={<OrganizerCabinet />} />
        <Route path="/invite" element={<InviteRegister />} />
        <Route path="/invite-verify" element={<InviteVerify />} />
        <Route path="/principles" element={<Principles />} />
        <Route path="/about" element={<About />} />
        <Route path="/organizer" element={<Organizer />} />
        <Route path="/steam-master-guide" element={<SteamMasterGuide />} />
        <Route path="/baths" element={<Baths />} />
        <Route path="/baths/:slug" element={<BathDetail />} />
        <Route path="/masters" element={<Masters />} />
        <Route path="/masters/:slug" element={<MasterDetail />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/category/:slug" element={<BlogCategory />} />
        <Route path="/blog/:slug" element={<BlogArticle />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/functional" element={<Functional />} />
        <Route path="/account-demo" element={<AccountDemo />} />
        <Route path="/events-demo" element={<EventsDemo />} />
        <Route path="/privacy" element={<Navigate to="/documents?tab=privacy" replace />} />
        <Route path="/terms" element={<Navigate to="/documents?tab=terms" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;