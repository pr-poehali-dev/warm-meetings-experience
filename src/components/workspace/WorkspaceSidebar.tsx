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
  openSections,
  toggleSection,
  switchRoleTab,
  switchMasterSection,
  switchOrgView,
  switchPartnerView,
  onCreateOrgEvent,
  logout,
}: WorkspaceSidebarProps) {
  const NavItem = ({ active, onClick, icon, label, accent, badge }: { active: boolean; onClick: () => void; icon: string; label: string; accent?: string; badge?: string | number }) => (
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
        <span className="text-[10px] font-semibold bg-primary/15 text-primary rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{badge}</span>
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
    label,
    children,
  }: {
    sectionKey: string;
    icon: string;
    accent: string;
    label: string;
    children: React.ReactNode;
  }) => {
    const open = openSections[sectionKey] ?? true;
    return (
      <div>
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center gap-1.5 px-3 mb-1.5 mt-3 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider hover:text-foreground transition-colors"
        >
          <Icon name={icon} size={11} className={accent} />
          <span className="flex-1 text-left">{label}</span>
          <Icon name="ChevronDown" size={12} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
        {open && <div className="space-y-0.5">{children}</div>}
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
        <CollapsibleSection sectionKey="master" icon="Flame" accent="text-orange-500" label="Мастер-услуги">
          {MASTER_NAV.filter((n) => n.id !== "dashboard").map((n) => (
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

      {/* Партнёр-разделы */}
      {isPartner && (
        <CollapsibleSection sectionKey="partner" icon="Building2" accent="text-violet-500" label="Управляющий">
          <NavItem
            active={roleTab === "partner" && partnerView === "baths"}
            onClick={() => switchPartnerView("baths")}
            icon="Building2"
            label="Мои бани"
            badge={bathsCount || undefined}
          />
          <NavItem
            active={roleTab === "partner" && partnerView === "add"}
            onClick={() => switchPartnerView("add")}
            icon="Plus"
            label="Добавить баню"
          />
        </CollapsibleSection>
      )}

      {/* Организатор-разделы */}
      {isOrganizer && (
        <CollapsibleSection sectionKey="organizer" icon="CalendarDays" accent="text-emerald-500" label="Мероприятия">
          <NavItem
            active={roleTab === "organizer" && orgView === "dashboard"}
            onClick={() => switchOrgView("dashboard")}
            icon="LayoutGrid"
            label="Мои события"
            badge={eventsCount || undefined}
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

      {/* Общий блок: Визитка + Telegram + Рассылки — для всех коммерческих ролей */}
      <div className="border-t border-border/60 pt-2 mt-3">
        <NavItem
          active={roleTab === "landing"}
          onClick={() => switchRoleTab("landing")}
          icon="Globe"
          label="Моя визитка"
          accent="text-orange-500"
        />
        <NavItem
          active={roleTab === "telegram"}
          onClick={() => switchRoleTab("telegram")}
          icon="Send"
          label="Telegram-каналы"
          badge={tgChannelsCount || undefined}
          accent="text-sky-500"
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
          icon="Bell"
          label="Рассылки"
          accent="text-rose-500"
        />
      </div>

      {/* Низ: личный кабинет + выход */}
      <div className="border-t border-border/60 pt-2 mt-3">
        <Link to="/account" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
          <Icon name="User" size={16} />Профиль
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
          <Icon name="LogOut" size={16} />Выйти
        </button>
      </div>
    </nav>
  );
}