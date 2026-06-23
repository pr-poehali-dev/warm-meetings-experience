import { lazy, Suspense, ComponentType } from "react";
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
import EmailVerifyBanner from "./components/auth/EmailVerifyBanner";
import { useKeyboardAwareInputs } from "./hooks/useKeyboardAwareInputs";

// Eager — критичные для первого экрана и максимально частые маршруты:
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RegisterChoice from "./pages/RegisterChoice";
import NotFoundPage from "./pages/NotFoundPage";
import LandingPage from "./pages/LandingPage";

// Обёртка над lazy: если чанк не загрузился (частая причина — деплой новой
// версии, в браузере осталась ссылка на старый чанк), пробуем ещё раз, а затем
// один раз перезагружаем страницу, чтобы подтянуть свежую сборку.
function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      const KEY = "chunk_reload_at";
      const last = Number(sessionStorage.getItem(KEY) || 0);
      // Защита от бесконечной перезагрузки: не чаще раза в 10 секунд
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
      throw err;
    }
  });
}

// Lazy — остальные страницы (загружаются по требованию).
const Events = lazyWithRetry(() => import("./pages/Events"));
const EventDetail = lazyWithRetry(() => import("./pages/EventDetail"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const Documents = lazyWithRetry(() => import("./pages/Documents"));
const Account = lazyWithRetry(() => import("./pages/Account"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Principles = lazyWithRetry(() => import("./pages/Principles"));
const Organizer = lazyWithRetry(() => import("./pages/Organizer"));
const Blog = lazyWithRetry(() => import("./pages/Blog"));
const BlogCategory = lazyWithRetry(() => import("./pages/BlogCategory"));
const BlogArticle = lazyWithRetry(() => import("./pages/BlogArticle"));
const SteamMasterGuide = lazyWithRetry(() => import("./pages/SteamMasterGuide"));
const MasterScheduleGuide = lazyWithRetry(() => import("./pages/MasterScheduleGuide"));
const Baths = lazyWithRetry(() => import("./pages/Baths"));
const BathDetail = lazyWithRetry(() => import("./pages/BathDetail"));
const Masters = lazyWithRetry(() => import("./pages/Masters"));
const MasterDetail = lazyWithRetry(() => import("./pages/MasterDetail"));
const About = lazyWithRetry(() => import("./pages/About"));
const Workspace = lazyWithRetry(() => import("./pages/Workspace"));
const InviteRegister = lazyWithRetry(() => import("./pages/InviteRegister"));
const InviteVerify = lazyWithRetry(() => import("./pages/InviteVerify"));
const PastEvents = lazyWithRetry(() => import("./pages/PastEvents"));
const VkCallback = lazyWithRetry(() => import("./pages/VkCallback"));
const YandexCallback = lazyWithRetry(() => import("./pages/YandexCallback"));
const EventShortLink = lazyWithRetry(() => import("./pages/EventShortLink"));
const GuestChat = lazyWithRetry(() => import("./pages/GuestChat"));
const MasterChat = lazyWithRetry(() => import("./pages/MasterChat"));
const VerifyEmail = lazyWithRetry(() => import("./pages/VerifyEmail"));
const LoginConfirm = lazyWithRetry(() => import("./pages/LoginConfirm"));
const Functional = lazyWithRetry(() => import("./pages/Functional"));
const FunctionalDescription = lazyWithRetry(() => import("./pages/FunctionalDescription"));
const Support = lazyWithRetry(() => import("./pages/Support"));

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
      <EmailVerifyBanner />
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
          <Route path="/login-confirm" element={<LoginConfirm />} />
          <Route path="/register" element={<RegisterChoice />} />
          <Route path="/register/form" element={<Register />} />
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
          <Route path="/support" element={<Support />} />
          <Route path="/functional" element={<Functional />} />
          <Route path="/features" element={<FunctionalDescription />} />
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