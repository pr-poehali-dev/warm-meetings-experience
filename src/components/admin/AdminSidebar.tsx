import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

type ViewType = 
  | "overview" 
  | "list" 
  | "add" 
  | "packages" 
  | "addons" 
  | "bookings" 
  | "service-areas" 
  | "multipliers" 
  | "holidays" 
  | "promo-codes" 
  | "settings"
  | "availability"
  | "event-signups"
  | "roles"
  | "blog"
  | "users"
  | "master-calendar"
  | "master-bookings"
  | "master-services"
  | "master-templates"
  | "master-settings";

interface AdminSidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onNewEvent: () => void;
  onLogout?: () => void;
}

const SidebarButton = ({
  view,
  currentView,
  onClick,
  icon,
  label,
}: {
  view: ViewType;
  currentView: ViewType;
  onClick: () => void;
  icon: string;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
      currentView === view
        ? "bg-gray-900 text-white"
        : "text-gray-700 hover:bg-gray-100"
    }`}
  >
    <Icon name={icon} size={18} />
    <span className="text-sm">{label}</span>
  </button>
);

const AdminSidebar = ({ currentView, onViewChange, onNewEvent, onLogout }: AdminSidebarProps) => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4 lg:p-6 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800">Админ-панель</h2>
        <p className="text-sm text-gray-500">Управление системой</p>
      </div>

      <nav className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Календарь мастера</p>
          <div className="space-y-1">
            <SidebarButton view="master-calendar" currentView={currentView} onClick={() => onViewChange("master-calendar")} icon="CalendarDays" label="Расписание" />
            <SidebarButton view="master-bookings" currentView={currentView} onClick={() => onViewChange("master-bookings")} icon="ClipboardCheck" label="Записи клиентов" />
            <SidebarButton view="master-services" currentView={currentView} onClick={() => onViewChange("master-services")} icon="Sparkles" label="Услуги" />
            <SidebarButton view="master-templates" currentView={currentView} onClick={() => onViewChange("master-templates")} icon="Copy" label="Шаблоны" />
            <SidebarButton view="master-settings" currentView={currentView} onClick={() => onViewChange("master-settings")} icon="SlidersHorizontal" label="Настройки" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Мероприятия</p>
          <div className="space-y-1">
            <SidebarButton view="overview" currentView={currentView} onClick={() => onViewChange("overview")} icon="LayoutDashboard" label="Обзор" />
            <SidebarButton view="list" currentView={currentView} onClick={() => onViewChange("list")} icon="List" label="Все мероприятия" />
            <button
              onClick={() => {
                onNewEvent();
                onViewChange("add");
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "add"
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="Plus" size={18} />
              <span className="text-sm">Добавить</span>
            </button>
            <SidebarButton view="event-signups" currentView={currentView} onClick={() => onViewChange("event-signups")} icon="ClipboardList" label="Заявки на события" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Калькулятор</p>
          <div className="space-y-1">
            <SidebarButton view="packages" currentView={currentView} onClick={() => onViewChange("packages")} icon="Package" label="Пакеты" />
            <SidebarButton view="addons" currentView={currentView} onClick={() => onViewChange("addons")} icon="ShoppingBag" label="Дополнения" />
            <SidebarButton view="bookings" currentView={currentView} onClick={() => onViewChange("bookings")} icon="FileText" label="Заявки" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Настройки цен</p>
          <div className="space-y-1">
            <SidebarButton view="service-areas" currentView={currentView} onClick={() => onViewChange("service-areas")} icon="MapPin" label="Зоны" />
            <SidebarButton view="multipliers" currentView={currentView} onClick={() => onViewChange("multipliers")} icon="TrendingUp" label="Множители" />
            <SidebarButton view="holidays" currentView={currentView} onClick={() => onViewChange("holidays")} icon="Calendar" label="Праздники" />
            <SidebarButton view="promo-codes" currentView={currentView} onClick={() => onViewChange("promo-codes")} icon="Tag" label="Промо-коды" />
            <SidebarButton view="settings" currentView={currentView} onClick={() => onViewChange("settings")} icon="Settings" label="Настройки" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Сообщество</p>
          <div className="space-y-1">
            <SidebarButton view="roles" currentView={currentView} onClick={() => onViewChange("roles")} icon="Shield" label="Роли" />
            <SidebarButton view="blog" currentView={currentView} onClick={() => onViewChange("blog")} icon="BookOpen" label="Блог" />
            <SidebarButton view="users" currentView={currentView} onClick={() => onViewChange("users")} icon="Users" label="Пользователи" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Занятость</p>
          <div className="space-y-1">
            <SidebarButton view="availability" currentView={currentView} onClick={() => onViewChange("availability")} icon="CalendarOff" label="Мои выходные" />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 space-y-1">
          <Link
            to="/events"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Icon name="ArrowLeft" size={18} />
            <span className="text-sm">На сайт</span>
          </Link>
          
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <Icon name="LogOut" size={18} />
              <span className="text-sm">Выйти</span>
            </button>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
