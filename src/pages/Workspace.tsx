import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import CabinetHeader from "@/components/CabinetHeader";

import { organizerApi, OrgEvent, DashboardData } from "@/lib/organizer-api";
import { partnerApi, PartnerBath } from "@/lib/partner-api";
import { useToast } from "@/hooks/use-toast";

import WorkspaceSidebar from "@/components/workspace/WorkspaceSidebar";
import WorkspaceContent from "@/components/workspace/WorkspaceContent";
import {
  RoleTab,
  MasterSection,
  OrgView,
  PartnerView,
  MASTER_NAV,
  ORG_NAV,
} from "@/components/workspace/workspace-types";

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
    return "dashboard";
  };

  const [roleTab, setRoleTab] = useState<RoleTab>(initialTab);
  const [masterSection, setMasterSection] = useState<MasterSection>((searchParams.get("section") as MasterSection) || "dashboard");
  const [orgView, setOrgView] = useState<OrgView>("dashboard");
  const [partnerView, setPartnerView] = useState<PartnerView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    master: true,
    partner: true,
    organizer: true,
  });
  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

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
  const [tgLinked, setTgLinked] = useState(false);
  const [tgChannelsCount, setTgChannelsCount] = useState(0);

  const loadTgInfo = useCallback(async () => {
    const token = localStorage.getItem("user_token") || "";
    if (!token) return;
    try {
      const r = await fetch(
        `https://functions.poehali.dev/c54f8799-96a5-4519-a2c7-e1b2e5f9d8c1/?action=tg_info&token=${encodeURIComponent(token)}`
      );
      const data = await r.json();
      if (data.tg_linked !== undefined) setTgLinked(data.tg_linked);
      if (data.tg_channels_count !== undefined) setTgChannelsCount(data.tg_channels_count);
    } catch { /* ignore */ }
  }, []);

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

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" /></div>;

  const masterId = user!.id;

  // Текущее название раздела в шапке
  const currentLabel = () => {
    if (roleTab === "telegram") return "Telegram-каналы";
    if (roleTab === "landing") return "Моя визитка";
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
      return `Партнёр · ${map[partnerView]}`;
    }
    const label = ORG_NAV.find((n) => n.id === orgView)?.label
      ?? (orgView === "create" ? "Создание события" : orgView === "edit" ? "Редактирование" : orgView === "participants" ? "Участники" : "Организатор");
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
        <aside className="hidden lg:block w-56 flex-shrink-0 border-r bg-card p-3 overflow-y-auto sticky top-14 h-[calc(100vh-56px)]">
          {sidebarNode}
        </aside>

        {/* Контент */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-5xl mx-auto">
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