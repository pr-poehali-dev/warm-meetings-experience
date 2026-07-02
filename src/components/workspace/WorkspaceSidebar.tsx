import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { MASTER_NAV, RoleTab, MasterSection, OrgView, PartnerView } from "./workspace-types";

interface WorkspaceSidebarProps {
  isMaster: boolean;
  isOrganizer: boolean;
  isPartner: boolean;
  roleTab: RoleTab;
  masterSection: MasterSection;
  orgView: OrgView;
  partnerView: PartnerView;
  bathsCount: number;
  eventsCount: number;
  tgChannelsCount?: number;
  unreadQuestions?: number;
  unreadMessages?: number;
  unreadGuestMessages?: number;
  openSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
  switchRoleTab: (tab: RoleTab) => void;
  switchMasterSection: (s: MasterSection) => void;
  switchOrgView: (v: OrgView) => void;
  switchPartnerView: (v: PartnerView) => void;
  onCreateOrgEvent: () => void;
  logout: () => void;
}

export default function WorkspaceSidebar({
  isMaster,
  isOrganizer,
  isPartner,
  roleTab,
  masterSection,
  orgView,
  partnerView,
  bathsCount,
  eventsCount,
  tgChannelsCount,
  unreadQuestions,
  unreadMessages,
  unreadGuestMessages,
  openSections,
  toggleSection,
  switchRoleTab,
  switchMasterSection,
  switchOrgView,
  switchPartnerView,
  onCreateOrgEvent,
  logout,
}: WorkspaceSidebarProps) {
  const NavItem = ({ active, onClick, icon, label, accent, badge, badgeUrgent }: { active: boolean; onClick: () => void; icon: string; label: string; accent?: string; badge?: string | number; badgeUrgent?: boolean }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      <Icon name={icon} size={16} className={active ? "" : accent || ""} />
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && badge !== 0 && badge !== "" && (
        <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center ${badgeUrgent ? "bg-rose-500 text-white" : "bg-primary/15 text-primary"}`}>{badge}</span>
      )}
    </button>
  );

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-3 mb-1.5 mt-3">{children}</div>
  );

  const CollapsibleSection = ({
    sectionKey,
    icon,
    accent,
    tint,
    label,
    children,
  }: {
    sectionKey: string;
    icon: string;
    accent: string;
    tint: string;
    label: string;
    children: React.ReactNode;
  }) => {
    const open = openSections[sectionKey] ?? true;
    return (
      <div className={`rounded-2xl border px-1.5 py-1 mt-3 ${tint}`}>
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center gap-1.5 px-1.5 mb-1 mt-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider hover:text-foreground transition-colors"
        >
          <Icon name={icon} size={11} className={accent} />
          <span className="flex-1 text-left">{label}</span>
          <Icon name="ChevronDown" size={12} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
        {open && <div className="space-y-0.5 pb-1">{children}</div>}
      </div>
    );
  };

  return (
    <nav className="space-y-0.5">
      {/* Сводка — всегда сверху */}
      <SectionLabel>Главное</SectionLabel>
      <NavItem
        active={roleTab === "dashboard"}
        onClick={() => switchRoleTab("dashboard")}
        icon="LayoutDashboard"
        label="Обзор"
      />

      {/* Мастер-разделы */}
      {isMaster && (
        <CollapsibleSection sectionKey="master" icon="Flame" accent="text-orange-500" tint="bg-orange-500/[0.04] border-orange-500/15" label="Мастер-услуги">
          {MASTER_NAV.filter((n) => n.id !== "dashboard" && n.id !== "messages").map((n) => (
            <NavItem
              key={n.id}
              active={roleTab === "master" && masterSection === n.id}
              onClick={() => switchMasterSection(n.id)}
              icon={n.icon}
              label={n.label}
            />
          ))}
        </CollapsibleSection>
      )}

      {/* Организатор-разделы */}
      {isOrganizer && (
        <CollapsibleSection sectionKey="organizer" icon="CalendarDays" accent="text-emerald-500" tint="bg-emerald-500/[0.04] border-emerald-500/15" label="Мероприятия">
          <NavItem
            active={roleTab === "organizer" && orgView === "dashboard"}
            onClick={() => switchOrgView("dashboard")}
            icon="LayoutGrid"
            label="Мои события"

          />
          <NavItem
            active={roleTab === "organizer" && (orgView === "create" || orgView === "edit")}
            onClick={onCreateOrgEvent}
            icon="Plus"
            label="Создать событие"
          />
          <NavItem
            active={roleTab === "organizer" && orgView === "calculator"}
            onClick={() => switchOrgView("calculator")}
            icon="Calculator"
            label="Калькулятор"
          />

        </CollapsibleSection>
      )}

      {/* Партнёр-разделы */}
      {isPartner && (
        <CollapsibleSection sectionKey="partner" icon="Building2" accent="text-violet-500" tint="bg-violet-500/[0.04] border-violet-500/15" label="Управляющий">
          <NavItem
            active={roleTab === "partner" && partnerView === "baths"}
            onClick={() => switchPartnerView("baths")}
            icon="Building2"
            label="Мои бани"

          />
          <NavItem
            active={roleTab === "partner" && partnerView === "add"}
            onClick={() => switchPartnerView("add")}
            icon="Plus"
            label="Добавить баню"
          />
        </CollapsibleSection>
      )}

      {/* Общий блок: Визитка + Telegram + Рассылки — для всех коммерческих ролей */}
      <div className="border-t border-border/60 pt-2 mt-3">
        {(isMaster || isOrganizer) && (
          <NavItem
            active={roleTab === "messages"}
            onClick={() => switchRoleTab("messages")}
            icon="MessagesSquare"
            label="Общение"
            accent="text-sky-500"
            badge={(unreadMessages || 0) + (unreadQuestions || 0) || undefined}
          />
        )}
        <NavItem
          active={roleTab === "landing"}
          onClick={() => switchRoleTab("landing")}
          icon="Globe"
          label="Моя визитка"
          accent="text-orange-500"
        />

        <NavItem
          active={roleTab === "notifications"}
          onClick={() => switchRoleTab("notifications")}
          icon="Bell"
          label="Центр уведомлений"
          accent="text-violet-500"
        />

        <NavItem
          active={roleTab === "blog"}
          onClick={() => switchRoleTab("blog")}
          icon="BookOpen"
          label="Блог"
          accent="text-amber-500"
        />
        <NavItem
          active={roleTab === "notify"}
          onClick={() => switchRoleTab("notify")}
          icon="Users"
          label="Гости"
          accent="text-rose-500"
        />

      </div>

      {/* Низ: личный кабинет + выход */}
      <div className="border-t border-border/60 pt-2 mt-3">
        <Link to="/account" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
          <Icon name="User" size={16} />Личный кабинет
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
          <Icon name="LogOut" size={16} />Выйти
        </button>
      </div>
    </nav>
  );
}