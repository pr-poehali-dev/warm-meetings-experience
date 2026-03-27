import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { ViewType } from "@/types/admin";
import { useAdminBadges, AdminBadges } from "@/hooks/useAdminBadges";

interface Tab {
  id: string;
  label: string;
  icon: string;
  badgeKey?: keyof AdminBadges;
  items: { view: ViewType; label: string; icon: string }[];
}

interface AdminTabsProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onNewEvent: () => void;
  onLogout?: () => void;
}

const tabs: Tab[] = [
  {
    id: "master",
    label: "Календарь",
    icon: "CalendarDays",
    badgeKey: "master",
    items: [
      { view: "master-calendar", label: "Расписание", icon: "CalendarDays" },
      { view: "master-bookings", label: "Записи", icon: "ClipboardCheck" },
      { view: "master-services", label: "Услуги", icon: "Sparkles" },
      { view: "master-templates", label: "Шаблоны", icon: "Copy" },
      { view: "master-settings", label: "Настройки", icon: "SlidersHorizontal" },
    ],
  },
  {
    id: "events",
    label: "Мероприятия",
    icon: "PartyPopper",
    badgeKey: "events",
    items: [
      { view: "overview", label: "Обзор", icon: "LayoutDashboard" },
      { view: "list", label: "Все", icon: "List" },
      { view: "add", label: "Создать", icon: "Plus" },
      { view: "event-signups", label: "Заявки", icon: "ClipboardList" },
    ],
  },
  {
    id: "calculator",
    label: "Калькулятор",
    icon: "Calculator",
    badgeKey: "calculator",
    items: [
      { view: "packages", label: "Пакеты", icon: "Package" },
      { view: "addons", label: "Дополнения", icon: "ShoppingBag" },
      { view: "bookings", label: "Заявки", icon: "FileText" },
    ],
  },
  {
    id: "pricing",
    label: "Цены",
    icon: "DollarSign",
    items: [
      { view: "service-areas", label: "Зоны", icon: "MapPin" },
      { view: "multipliers", label: "Множители", icon: "TrendingUp" },
      { view: "holidays", label: "Праздники", icon: "Calendar" },
      { view: "promo-codes", label: "Промо-коды", icon: "Tag" },
      { view: "settings", label: "Настройки", icon: "Settings" },
      { view: "availability", label: "Выходные", icon: "CalendarOff" },
    ],
  },
  {
    id: "community",
    label: "Сообщество",
    icon: "Users",
    badgeKey: "community",
    items: [
      { view: "roles", label: "Роли", icon: "Shield" },
      { view: "blog", label: "Блог", icon: "BookOpen" },
      { view: "users", label: "Пользователи", icon: "Users" },
    ],
  },
];

function getActiveTab(currentView: ViewType): string {
  for (const tab of tabs) {
    if (tab.items.some((item) => item.view === currentView)) {
      return tab.id;
    }
  }
  return tabs[0].id;
}

const Badge = ({ count }: { count: number }) => {
  if (!count) return null;
  return (
    <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
};

const AdminTabs = ({ currentView, onViewChange, onNewEvent, onLogout }: AdminTabsProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { badges } = useAdminBadges();
  const activeTabId = getActiveTab(currentView);
  const activeTab = tabs.find((t) => t.id === activeTabId)!;

  const handleItemClick = (view: ViewType) => {
    if (view === "add") onNewEvent();
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900 hidden sm:block">Админ</h1>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Icon name={mobileMenuOpen ? "X" : "Menu"} size={20} />
            </button>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {tabs.map((tab) => {
              const badgeCount = tab.badgeKey ? badges[tab.badgeKey] : 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleItemClick(tab.items[0].view)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTabId === tab.id
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon name={tab.icon} size={16} />
                  {tab.label}
                  <Badge count={badgeCount} />
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/events"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Icon name="ArrowLeft" size={16} />
              <span className="hidden sm:inline">На сайт</span>
            </Link>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Icon name="LogOut" size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1 pb-2 -mt-1 overflow-x-auto">
          {activeTab.items.map((item) => (
            <button
              key={item.view}
              onClick={() => handleItemClick(item.view)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                currentView === item.view
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon name={item.icon} size={14} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white shadow-lg max-h-[70vh] overflow-y-auto">
          <div className="p-3 space-y-3">
            {tabs.map((tab) => {
              const badgeCount = tab.badgeKey ? badges[tab.badgeKey] : 0;
              return (
                <div key={tab.id}>
                  <div className="flex items-center gap-2 px-2 mb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase">{tab.label}</p>
                    {badgeCount > 0 && (
                      <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {tab.items.map((item) => (
                      <button
                        key={item.view}
                        onClick={() => handleItemClick(item.view)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          currentView === item.view
                            ? "bg-gray-900 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Icon name={item.icon} size={16} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

export default AdminTabs;
