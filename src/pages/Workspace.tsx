import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import CabinetHeader from "@/components/CabinetHeader";

import { organizerApi, OrgEvent, DashboardData } from "@/lib/organizer-api";
import { partnerApi, PartnerBath } from "@/lib/partner-api";
import { masterChatApi } from "@/lib/master-calendar-api";
import { mastersApi } from "@/lib/masters-api";
import { useToast } from "@/hooks/use-toast";

import WorkspaceSidebar from "@/components/workspace/WorkspaceSidebar";
import WorkspaceContent from "@/components/workspace/WorkspaceContent";
import OnboardingTour, { TourStep } from "@/components/onboarding/OnboardingTour";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import {
  RoleTab,
  MasterSection,
  OrgView,
  PartnerView,
  MASTER_NAV,
  ORG_NAV,
} from "@/components/workspace/workspace-types";

const WORKSPACE_TOUR_STEPS: TourStep[] = [
  { title: "Это ваш банный кабинет", description: "Здесь вы управляете услугами, событиями и банями. Покажем главное за минуту.", icon: "Briefcase" },
  { target: '[data-tour="ws-sidebar"]', title: "Меню разделов", description: "Слева — все ваши инструменты по ролям: мастер-услуги, мероприятия, управление банями.", icon: "Menu" },
  { target: '[data-tour="ws-content"]', title: "Рабочая область", description: "Здесь открывается выбранный раздел: записи, расписание, статистика и настройки.", icon: "LayoutDashboard" },
  { target: '[data-tour="ws-create"]', title: "Создавайте события", description: "Нажмите, чтобы добавить новое мероприятие и опубликовать его для гостей.", icon: "Plus" },
];

// ─── Главная страница ─────────────────────────────────────────────────────────

export default function Workspace() {
  const { user, loading: authLoading, hasRole, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const isMaster = hasRole("parmaster");
  const isOrganizer = hasRole("organizer");
  const isPartner = hasRole("partner");

  // Определяем начальный таб по ролям и URL
  const initialTab = (): RoleTab => {
    const p = searchParams.get("tab") as RoleTab | null;
    if (p === "master" && isMaster) return "master";
    if (p === "organizer" && isOrganizer) return "organizer";
    if (p === "partner" && isPartner) return "partner";
    if (p === "telegram") return "telegram";
    if (p === "landing") return "landing";
    if (p === "notify") return "notify";
    return "dashboard";
  };

  const [roleTab, setRoleTab] = useState<RoleTab>(initialTab);
  const [masterSection, setMasterSection] = useState<MasterSection>((searchParams.get("section") as MasterSection) || "dashboard");
  const [orgView, setOrgView] = useState<OrgView>("dashboard");
  const [partnerView, setPartnerView] = useState<PartnerView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("ws_open_sections");
      if (saved) return JSON.parse(saved);
    } catch (_) { /* ignore */ }
    return { master: true, partner: true, organizer: true };
  });
  const toggleSection = (key: string) =>
    setOpenSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("ws_open_sections", JSON.stringify(next));
      return next;
    });

  // Partner state
  const [baths, setBaths] = useState<PartnerBath[]>([]);
  const [bathsLoading, setBathsLoading] = useState(false);
  const [editingBath, setEditingBath] = useState<PartnerBath | null>(null);

  const loadBaths = useCallback(() => {
    setBathsLoading(true);
    partnerApi.listBaths()
      .then((d) => setBaths(d.baths))
      .catch(() => {})
      .finally(() => setBathsLoading(false));
  }, []);

  // Telegram info — общий для всех коммерческих ролей
  const userToken = typeof window !== "undefined" ? localStorage.getItem("user_token") || "" : "";
  const { data: tgInfo, refetch: refetchTgInfo } = useQuery({
    queryKey: ["tg-info", userToken],
    enabled: !!user && !!userToken,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const r = await fetch(
        `https://functions.poehali.dev/c54f8799-96a5-4519-a2c7-e1b2e5f9d8c1/?action=tg_info&token=${encodeURIComponent(userToken)}`
      );
      return r.json();
    },
  });
  const [tgLinkedOverride, setTgLinked] = useState<boolean | null>(null);
  const [tgChannelsCountOverride, setTgChannelsCount] = useState<number | null>(null);
  const tgLinked = tgLinkedOverride ?? !!tgInfo?.tg_linked;
  const tgChannelsCount = tgChannelsCountOverride ?? Number(tgInfo?.tg_channels_count ?? 0);
  const loadTgInfo = useCallback(async () => { await refetchTgInfo(); }, [refetchTgInfo]);

  // Реальный masters.id (не user.id)
  const [masterId, setMasterId] = useState<number>(0);
  useEffect(() => {
    if (!isMaster) return;
    mastersApi.getMyProfile().then((m) => setMasterId(m.id)).catch(() => {});
  }, [isMaster]);

  // Непрочитанные сообщения от гостей (для бейджа в разделе «Сообщения»)
  const [unreadMessages, setUnreadMessages] = useState(0);
  useEffect(() => {
    if (!isMaster || !masterId) return;
    let cancelled = false;
    const loadUnread = () => {
      masterChatApi
        .getUnreadCount(masterId)
        .then((r) => { if (!cancelled) setUnreadMessages(r.unread || 0); })
        .catch(() => {});
    };
    loadUnread();
    const t = setInterval(loadUnread, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [isMaster, masterId, masterSection]);

  // Непрочитанные сообщения от гостей у организатора (бейдж в разделе «Мои события»)
  const [unreadGuestMessages, setUnreadGuestMessages] = useState(0);
  useEffect(() => {
    if (!isOrganizer) return;
    let cancelled = false;
    const loadUnread = () => {
      organizerApi
        .getGuestsUnreadCount()
        .then((r) => { if (!cancelled) setUnreadGuestMessages(r.unread || 0); })
        .catch(() => {});
    };
    loadUnread();
    const t = setInterval(loadUnread, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [isOrganizer, orgView]);

  // Organizer state
  const [orgDashboard, setOrgDashboard] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<OrgEvent | null>(null);
  const [formData, setFormData] = useState<OrgEvent & { submit_action?: string }>({} as OrgEvent);
  const formDataRef = { current: formData };
  formDataRef.current = formData;
  const [orgFormLoading, setOrgFormLoading] = useState(false);

  const loadOrgDashboard = useCallback(async () => {
    try {
      const data = await organizerApi.getDashboard();
      setOrgDashboard(data);
      // Синхронизируем tg-данные из дашборда организатора
      if (data.tg_linked !== undefined) setTgLinked(data.tg_linked);
      if (data.tg_channels_count !== undefined) setTgChannelsCount(data.tg_channels_count);
    } catch { /* ignore */ }
  }, []);

  const loadOrgEvents = useCallback(async () => {
    try { const data = await organizerApi.getEvents(); setEvents(data); } catch { toast({ title: "Ошибка загрузки событий", variant: "destructive" }); }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login?redirect=/workspace"); return; }
    if (!isMaster && !isOrganizer && !isPartner) { navigate("/account"); return; }
    if (isOrganizer) { loadOrgDashboard(); loadOrgEvents(); }
    if (isPartner) { loadBaths(); }
    loadTgInfo();
  }, [authLoading, user, isMaster, isOrganizer, isPartner, navigate, loadOrgDashboard, loadOrgEvents, loadBaths, loadTgInfo]);

  const switchRoleTab = (tab: RoleTab) => {
    setRoleTab(tab);
    setSearchParams({ tab });
    setSidebarOpen(false);
  };

  const switchMasterSection = (s: MasterSection) => {
    setRoleTab("master");
    setMasterSection(s);
    setSearchParams({ tab: "master", section: s });
    setSidebarOpen(false);
  };

  const switchOrgView = (v: OrgView) => {
    setRoleTab("organizer");
    setOrgView(v);
    setSearchParams({ tab: "organizer" });
    setSidebarOpen(false);
  };

  const switchPartnerView = (v: PartnerView) => {
    setRoleTab("partner");
    setPartnerView(v);
    if (v !== "edit") setEditingBath(null);
    setSearchParams({ tab: "partner" });
    setSidebarOpen(false);
  };

  const tourReady = !authLoading && !!user && (isMaster || isOrganizer || isPartner);
  const tour = useOnboardingTour("workspace", tourReady);
  const tourSteps = isOrganizer ? WORKSPACE_TOUR_STEPS : WORKSPACE_TOUR_STEPS.filter((s) => s.target !== '[data-tour="ws-create"]');

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" /></div>;

  // Текущее название раздела в шапке
  const currentLabel = () => {
    if (roleTab === "telegram") return "Telegram-каналы";
    if (roleTab === "landing") return "Моя визитка";
    if (roleTab === "notify") return "Рассылки";
    if (roleTab === "dashboard") return "Обзор";
    if (roleTab === "master") {
      const label = MASTER_NAV.find((n) => n.id === masterSection)?.label ?? "Мастер";
      return `Мастер · ${label}`;
    }
    if (roleTab === "partner") {
      const map: Record<PartnerView, string> = {
        dashboard: "Обзор",
        baths: "Мои бани",
        add: "Добавить баню",
        edit: "Редактирование бани",
      };
      return `Управляющий · ${map[partnerView]}`;
    }
    const label = ORG_NAV.find((n) => n.id === orgView)?.label
      ?? (orgView === "create" ? "Создание события" : orgView === "edit" ? "Редактирование" : orgView === "participants" ? "Участники" : orgView === "questions" ? "Вопросы по событиям" : "Организатор");
    return `Организатор · ${label}`;
  };

  const sidebarNode = (
    <WorkspaceSidebar
      isMaster={isMaster}
      isOrganizer={isOrganizer}
      isPartner={isPartner}
      roleTab={roleTab}
      masterSection={masterSection}
      orgView={orgView}
      partnerView={partnerView}
      bathsCount={baths.length}
      eventsCount={events.length}
      tgChannelsCount={tgChannelsCount}
      unreadQuestions={orgDashboard?.unread_questions ?? orgDashboard?.stats?.unread_questions ?? 0}
      unreadMessages={unreadMessages}
      unreadGuestMessages={unreadGuestMessages}
      openSections={openSections}
      toggleSection={toggleSection}
      switchRoleTab={switchRoleTab}
      switchMasterSection={switchMasterSection}
      switchOrgView={switchOrgView}
      switchPartnerView={switchPartnerView}
      onCreateOrgEvent={() => { setSelectedEvent(null); setFormData({} as OrgEvent); switchOrgView("create"); }}
      logout={logout}
    />
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OnboardingTour steps={tourSteps} open={tour.open} onClose={tour.close} onFinish={tour.finish} />
      {/* Шапка */}
      <CabinetHeader
        icon="Briefcase"
        title="Моё дело"
        subtitle={currentLabel()}
        onMenuToggle={() => setSidebarOpen((v) => !v)}
        menuOpen={sidebarOpen}
        actions={
          isOrganizer ? (
            <Button
              data-tour="ws-create"
              size="sm"
              onClick={() => { setSelectedEvent(null); setFormData({} as OrgEvent); switchOrgView("create"); }}
              className="gap-1.5 h-9 hidden sm:inline-flex"
            >
              <Icon name="Plus" size={14} />Создать событие
            </Button>
          ) : undefined
        }
        onLogout={logout}
      />

      {/* Мобильное меню */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setSidebarOpen(false)}>
          <div className="absolute left-0 top-14 bottom-0 w-64 bg-card border-r shadow-xl p-3 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {sidebarNode}
          </div>
        </div>
      )}

      {/* Основной layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Десктопный сайдбар */}
        <aside data-tour="ws-sidebar" className="hidden lg:block w-56 flex-shrink-0 border-r bg-card p-3 overflow-y-auto sticky top-14 h-[calc(100vh-56px)]">
          {sidebarNode}
          <button
            onClick={tour.restart}
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
          >
            <Icon name="GraduationCap" size={14} />
            Пройти обучение заново
          </button>
        </aside>

        {/* Контент */}
        <main className="flex-1 overflow-y-auto min-h-0">
          <div data-tour="ws-content" className="p-4 sm:p-6 pb-24 max-w-5xl mx-auto">
            <WorkspaceContent
              roleTab={roleTab}
              masterSection={masterSection}
              orgView={orgView}
              partnerView={partnerView}
              isMaster={isMaster}
              isOrganizer={isOrganizer}
              isPartner={isPartner}
              masterId={masterId}
              baths={baths}
              bathsLoading={bathsLoading}
              editingBath={editingBath}
              setEditingBath={setEditingBath}
              loadBaths={loadBaths}
              switchPartnerView={switchPartnerView}
              orgDashboard={orgDashboard}
              events={events}
              selectedEvent={selectedEvent}
              setSelectedEvent={setSelectedEvent}
              formData={formData}
              setFormData={setFormData}
              formDataRef={formDataRef}
              orgFormLoading={orgFormLoading}
              setOrgFormLoading={setOrgFormLoading}
              setOrgView={setOrgView}
              loadOrgDashboard={loadOrgDashboard}
              loadOrgEvents={loadOrgEvents}
              toast={toast}
              switchRoleTab={switchRoleTab}
              switchMasterSection={switchMasterSection}
              tgLinked={tgLinked}
              tgChannelsCount={tgChannelsCount}
              refreshTgInfo={loadTgInfo}
            />
          </div>
        </main>
      </div>
    </div>
  );
}