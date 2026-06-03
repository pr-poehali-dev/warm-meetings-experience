import { lazy, Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import RoleGuard from "./components/RoleGuard";
import CookieConsent from "./components/CookieConsent";
import MetrikaTracker from "./components/MetrikaTracker";
import SupportWidget from "./components/support/SupportWidget";
import { useKeyboardAwareInputs } from "./hooks/useKeyboardAwareInputs";

// Eager — критичные для первого экрана и максимально частые маршруты:
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFoundPage from "./pages/NotFoundPage";
import LandingPage from "./pages/LandingPage";

// Lazy — остальные страницы (загружаются по требованию).
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Admin = lazy(() => import("./pages/Admin"));
const Documents = lazy(() => import("./pages/Documents"));
const Account = lazy(() => import("./pages/Account"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Principles = lazy(() => import("./pages/Principles"));
const Organizer = lazy(() => import("./pages/Organizer"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogCategory = lazy(() => import("./pages/BlogCategory"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const SteamMasterGuide = lazy(() => import("./pages/SteamMasterGuide"));
const MasterScheduleGuide = lazy(() => import("./pages/MasterScheduleGuide"));
const Baths = lazy(() => import("./pages/Baths"));
const BathDetail = lazy(() => import("./pages/BathDetail"));
const Masters = lazy(() => import("./pages/Masters"));
const MasterDetail = lazy(() => import("./pages/MasterDetail"));
const About = lazy(() => import("./pages/About"));
const Workspace = lazy(() => import("./pages/Workspace"));
const InviteRegister = lazy(() => import("./pages/InviteRegister"));
const InviteVerify = lazy(() => import("./pages/InviteVerify"));
const PastEvents = lazy(() => import("./pages/PastEvents"));
const VkCallback = lazy(() => import("./pages/VkCallback"));
const YandexCallback = lazy(() => import("./pages/YandexCallback"));
const EventShortLink = lazy(() => import("./pages/EventShortLink"));
const GuestChat = lazy(() => import("./pages/GuestChat"));
const MasterChat = lazy(() => import("./pages/MasterChat"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Functional = lazy(() => import("./pages/Functional"));
const IndexGlass = lazy(() => import("./pages/IndexGlass"));
const IndexNew = lazy(() => import("./pages/IndexNew"));
const FunctionalDescription = lazy(() => import("./pages/FunctionalDescription"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,         // 1 минута — фон не дёргает бэк лишний раз
      gcTime: 10 * 60_000,       // 10 минут хранения в памяти
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const AppContent = () => {
  useKeyboardAwareInputs();
  return (
    <>
      <ScrollToTop />
      <MetrikaTracker />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/past" element={<PastEvents />} />
          <Route path="/events/:slug" element={<EventDetail />} />
          <Route path="/e/:code" element={<EventShortLink />} />
          <Route path="/g/:token" element={<GuestChat />} />
          <Route path="/m/:token" element={<MasterChat />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/vk/callback" element={<VkCallback />} />
          <Route path="/auth/yandex/callback" element={<YandexCallback />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/register" element={<Register />} />
          <Route path="/account" element={<RoleGuard role="auth"><Account /></RoleGuard>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<RoleGuard role="admin"><Admin /></RoleGuard>} />
          <Route path="/workspace" element={<RoleGuard role={["parmaster", "organizer", "partner"]}><Workspace /></RoleGuard>} />
          <Route path="/organizer-cabinet" element={<Navigate to="/workspace?tab=organizer" replace />} />
          <Route path="/master" element={<Navigate to="/workspace?tab=master" replace />} />
          <Route path="/partner" element={<Navigate to="/workspace?tab=partner" replace />} />
          <Route path="/invite" element={<InviteRegister />} />
          <Route path="/invite-verify" element={<InviteVerify />} />
          <Route path="/principles" element={<Principles />} />
          <Route path="/about" element={<About />} />
          <Route path="/organizer" element={<Organizer />} />
          <Route path="/steam-master-guide" element={<SteamMasterGuide />} />
          <Route path="/master-schedule-guide" element={<MasterScheduleGuide />} />
          <Route path="/baths" element={<Baths />} />
          <Route path="/baths/:slug" element={<BathDetail />} />
          <Route path="/masters" element={<Masters />} />
          <Route path="/masters/:slug" element={<MasterDetail />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/category/:slug" element={<BlogCategory />} />
          <Route path="/blog/:slug" element={<BlogArticle />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/functional" element={<Functional />} />
          <Route path="/features" element={<FunctionalDescription />} />
          <Route path="/index-glass" element={<IndexGlass />} />
          <Route path="/home-new" element={<IndexNew />} />
          <Route path="/privacy" element={<Navigate to="/documents?tab=privacy" replace />} />
          <Route path="/terms" element={<Navigate to="/documents?tab=terms" replace />} />
          {/* Персональные мини-сайты пользователей. ВАЖНО: должно быть последним перед NotFound */}
          <Route path="/:slug" element={<LandingPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="sparcom-theme">
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" offset={16} />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
          <SupportWidget />
          <CookieConsent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;