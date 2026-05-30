import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrgEvent, DashboardData } from "@/lib/organizer-api";
import { PartnerBath } from "@/lib/partner-api";
import React, { useState } from "react";
import OrgDashboard from "@/components/organizer/OrgDashboard";
import MyArticles from "@/components/account/MyArticles";
import LiveEventEditor from "@/components/organizer/LiveEventEditor";
import EventGuestsDialog from "@/components/crm/EventGuestsDialog";
import TelegramSettings from "@/components/organizer/TelegramSettings";
import EventCalculator from "@/components/organizer/EventCalculator";
import EventQuestionsSection from "@/components/organizer/EventQuestionsSection";
import CrmModule from "@/components/crm/CrmModule";
import BathCard from "@/components/partner/BathCard";
import BathForm from "@/components/partner/BathForm";
import PartnerStats from "@/components/partner/PartnerStats";
import WorkspaceDashboard from "@/components/workspace/WorkspaceDashboard";
import LandingSection from "@/components/workspace/landing/LandingSection";
import {
  MasterDashboardSection,
  MasterProfileSection,
  MasterScheduleSection,
  MasterBookingsSection,
  MasterReviewsSection,
  MasterFinancesSection,
  MasterNotificationsSection,
} from "./MasterSections";
import MasterAddresses from "@/components/master/addresses/MasterAddresses";
import { RoleTab, MasterSection, OrgView, PartnerView } from "./workspace-types";

interface WorkspaceContentProps {
  roleTab: RoleTab;
  masterSection: MasterSection;
  orgView: OrgView;
  partnerView: PartnerView;
  isMaster: boolean;
  isOrganizer: boolean;
  isPartner: boolean;
  masterId: number;

  // Partner
  baths: PartnerBath[];
  bathsLoading: boolean;
  editingBath: PartnerBath | null;
  setEditingBath: (b: PartnerBath | null) => void;
  loadBaths: () => void;
  switchPartnerView: (v: PartnerView) => void;

  // Organizer
  orgDashboard: DashboardData | null;
  events: OrgEvent[];
  selectedEvent: OrgEvent | null;
  setSelectedEvent: (e: OrgEvent | null) => void;
  formData: OrgEvent & { submit_action?: string };
  setFormData: (d: OrgEvent & { submit_action?: string }) => void;
  formDataRef: { current: OrgEvent & { submit_action?: string } };
  orgFormLoading: boolean;
  setOrgFormLoading: (b: boolean) => void;
  setOrgView: (v: OrgView) => void;
  loadOrgDashboard: () => Promise<void>;
  loadOrgEvents: () => Promise<void>;
  toast: (args: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

  // Role tab switcher (used by dashboard cards)
  switchRoleTab: (t: RoleTab) => void;

  // Telegram info (общий для всех ролей)
  tgLinked: boolean;
  tgChannelsCount: number;
  refreshTgInfo: () => void;
}

import { organizerApi } from "@/lib/organizer-api";

export default function WorkspaceContent(props: WorkspaceContentProps) {
  const {
    roleTab,
    masterSection,
    orgView,
    partnerView,
    isMaster,
    isOrganizer,
    isPartner,
    masterId,
    baths,
    bathsLoading,
    editingBath,
    setEditingBath,
    loadBaths,
    switchPartnerView,
    orgDashboard,
    events,
    selectedEvent,
    setSelectedEvent,
    formData,
    setFormData,
    formDataRef,
    orgFormLoading,
    setOrgFormLoading,
    setOrgView,
    loadOrgDashboard,
    loadOrgEvents,
    toast,
    switchRoleTab,
    tgLinked,
    tgChannelsCount,
    refreshTgInfo,
  } = props;

  // Диалог гостей события (CRM)
  const [guestsDialog, setGuestsDialog] = useState<{ id: number; title: string } | null>(null);

  const guestsDialogNode = guestsDialog ? (
    <EventGuestsDialog
      open={!!guestsDialog}
      eventId={guestsDialog.id}
      eventTitle={guestsDialog.title}
      onClose={() => { setGuestsDialog(null); loadOrgEvents(); loadOrgDashboard(); }}
    />
  ) : null;

  // ─── Универсальный раздел «Моя визитка» для всех коммерческих ролей ────────
  if (roleTab === "landing") {
    return <>{guestsDialogNode}<LandingSection /></>;
  }

  // ─── Универсальный раздел «Клиенты» (CRM) для всех коммерческих ролей ──────
  if (roleTab === "notify") {
    const crmRole: "organizer" | "master" | "partner" =
      isPartner ? "partner" : isOrganizer ? "organizer" : isMaster ? "master" : "organizer";
    return (
      <div className="max-w-5xl mx-auto">
        <CrmModule role={crmRole} />
      </div>
    );
  }

  // ─── Блог — доступен всем пользователям ─────────────────────────────────────
  if (roleTab === "blog") {
    return (
      <div className="max-w-3xl mx-auto">
        <MyArticles />
      </div>
    );
  }

  // ─── Универсальный раздел Telegram для всех коммерческих ролей ──────────────
  if (roleTab === "telegram") {
    const userRole = isOrganizer ? "organizer" : isMaster ? "master" : isPartner ? "partner" : "organizer";
    return (
      <div className="max-w-2xl mx-auto">
        <TelegramSettings
          tgLinked={tgLinked}
          tgChannelsCount={tgChannelsCount}
          userId={masterId}
          onRefresh={refreshTgInfo}
          userRole={userRole}
        />
      </div>
    );
  }

  if (roleTab === "dashboard") {
    return (
      <WorkspaceDashboard
        isMaster={isMaster}
        isOrganizer={isOrganizer}
        onGoToMaster={() => switchRoleTab("master")}
        onGoToOrganizer={() => switchRoleTab("organizer")}
      />
    );
  }

  if (roleTab === "master" && isMaster) {
    switch (masterSection) {
      case "dashboard": return <MasterDashboardSection masterId={masterId} />;
      case "profile": return <MasterProfileSection masterId={masterId} />;
      case "addresses": return <div className="space-y-4"><MasterAddresses masterId={masterId} /></div>;
      case "schedule": return <MasterScheduleSection masterId={masterId} />;
      case "bookings": return <MasterBookingsSection masterId={masterId} />;
      case "reviews": return <MasterReviewsSection masterId={masterId} />;
      case "finances": return <MasterFinancesSection masterId={masterId} />;
      case "notifications": return <MasterNotificationsSection masterId={masterId} />;
    }
  }

  if (roleTab === "partner" && isPartner) {
    if (partnerView === "dashboard" || partnerView === "baths") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{partnerView === "baths" ? "Мои бани" : "Управляющий"}</h2>
            <Button size="sm" onClick={() => switchPartnerView("add")} className="gap-1.5">
              <Icon name="Plus" size={14} />
              Добавить баню
            </Button>
          </div>

          {partnerView === "dashboard" && <PartnerStats />}

          {bathsLoading ? (
            <div className="flex justify-center py-16">
              <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
            </div>
          ) : baths.length > 0 ? (
            <div className="space-y-2">
              {baths.map((bath) => (
                <BathCard
                  key={bath.id}
                  bath={bath}
                  onEdit={(b) => { setEditingBath(b); switchPartnerView("edit"); }}
                  onChanged={loadBaths}
                  userId={masterId}
                />
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm border-dashed">
              <CardContent className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
                  <Icon name="Building2" size={24} className="text-violet-400" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Добавьте первую баню</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Зарегистрируйте свою баню в каталоге, чтобы гости могли вас найти
                </p>
                <Button onClick={() => switchPartnerView("add")} className="gap-2">
                  <Icon name="Plus" size={15} />
                  Добавить баню
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }
    if (partnerView === "add") {
      return (
        <div className="max-w-2xl mx-auto">
          <BathForm
            onSaved={() => { loadBaths(); switchPartnerView("baths"); }}
            onCancel={() => switchPartnerView("baths")}
          />
        </div>
      );
    }
    if (partnerView === "edit" && editingBath) {
      return (
        <div className="max-w-2xl mx-auto">
          <BathForm
            bath={editingBath}
            onSaved={() => { loadBaths(); setEditingBath(null); switchPartnerView("baths"); }}
            onCancel={() => { setEditingBath(null); switchPartnerView("baths"); }}
          />
        </div>
      );
    }
  }

  if (roleTab === "organizer" && isOrganizer) {
    const wrap = (node: React.ReactNode) => <>{guestsDialogNode}{node}</>;
    switch (orgView) {
      case "dashboard":
        return wrap(orgDashboard ? (
          <OrgDashboard
            data={orgDashboard}
            events={events}
            eventsLoading={false}
            onCreateEvent={() => setOrgView("create")}
            onManageEvent={(ev) => { setSelectedEvent(ev); setGuestsDialog({ id: ev.id, title: ev.title }); }}
            onEditEvent={async (ev) => {
              setSelectedEvent(ev);
              let fullEvent = ev;
              try { fullEvent = await organizerApi.getEvent(ev.id); } catch { /* fallback */ }
              setFormData({ ...fullEvent });
              setOrgView("edit");
            }}
            onDuplicateEvent={(ev) => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setSelectedEvent(null);
              setFormData({ ...ev, id: 0, event_date: tomorrow.toISOString().split("T")[0], is_visible: false, spots_left: ev.total_spots });
              setOrgView("create");
            }}
            onRepeat={async (ev, dates) => {
              for (const date of dates) {
                try { await organizerApi.createEvent({ ...ev, id: 0, event_date: date, is_visible: false, submit_action: "draft" } as Parameters<typeof organizerApi.createEvent>[0]); } catch { /* skip */ }
              }
              await Promise.all([loadOrgDashboard(), loadOrgEvents()]);
              toast({ title: `Создано ${dates.length} событий` });
            }}
            onToggleVisibility={async (ev) => {
              try {
                await organizerApi.updateEvent({ id: ev.id, is_visible: !ev.is_visible } as OrgEvent & { id: number });
                await Promise.all([loadOrgEvents(), loadOrgDashboard()]);
              } catch { toast({ title: "Ошибка", variant: "destructive" }); }
            }}
            onDeleteEvent={async (ev) => {
              if (!confirm(`Скрыть событие «${ev.title}»?`)) return;
              try { await organizerApi.deleteEvent(ev.id); await Promise.all([loadOrgEvents(), loadOrgDashboard()]); } catch { toast({ title: "Ошибка", variant: "destructive" }); }
            }}
          />
        ) : <div className="flex justify-center py-16"><Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" /></div>);
      case "create":
      case "edit":
        return wrap(
          <div className="max-w-2xl mx-auto">
            <LiveEventEditor
              formData={formData}
              initialData={selectedEvent}
              loading={orgFormLoading}
              onFormChange={(data) => setFormData(data as OrgEvent)}
              onSubmit={async (e, _saveAndNew, override) => {
                e.preventDefault();
                if (orgFormLoading) return;
                const merged = { ...formDataRef.current, ...(override || {}) } as OrgEvent & { submit_action?: string };
                setOrgFormLoading(true);
                try {
                  const submitAction = merged.submit_action || "draft";
                  const existingId = selectedEvent?.id || merged.id;
                  if (existingId) {
                    const updated = await organizerApi.updateEvent({ ...merged, id: existingId, submit_action: submitAction } as OrgEvent & { id: number; submit_action: string });
                    setFormData({ ...updated });
                    setSelectedEvent(updated);
                    toast({ title: submitAction === "submit" ? "Событие отправлено на модерацию" : "Черновик сохранён" });
                    if (submitAction === "submit") setOrgView("dashboard");
                  } else {
                    const created = await organizerApi.createEvent({ ...merged, submit_action: submitAction } as Parameters<typeof organizerApi.createEvent>[0]);
                    setSelectedEvent(created);
                    setFormData({ ...created });
                    toast({ title: submitAction === "submit" ? "Событие отправлено на модерацию" : "Черновик сохранён" });
                    if (submitAction === "submit") setOrgView("dashboard");
                  }
                  await Promise.all([loadOrgDashboard(), loadOrgEvents()]);
                } catch (e: unknown) {
                  toast({ title: "Ошибка", description: e instanceof Error ? e.message : "Не удалось сохранить", variant: "destructive" });
                } finally {
                  setOrgFormLoading(false);
                }
              }}
              onCancel={() => setOrgView("dashboard")}
            />
          </div>
        );
       
      case "participants":
      case "notify":
        // Старые роуты больше не используются — всё через CRM диалог.
        if (selectedEvent && !guestsDialog) {
          setGuestsDialog({ id: selectedEvent.id, title: selectedEvent.title });
          setOrgView("dashboard");
        }
        return wrap(null);
      case "calculator": return wrap(<EventCalculator onCreateEvent={(data) => { setFormData(data as OrgEvent); setSelectedEvent(null); setOrgView("create"); }} />);
      case "questions": return wrap(<EventQuestionsSection />);
      case "blog": return wrap(<div className="max-w-3xl mx-auto"><MyArticles /></div>);
    }
  }

  return guestsDialogNode;
}