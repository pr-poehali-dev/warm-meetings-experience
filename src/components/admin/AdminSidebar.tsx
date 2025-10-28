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
  | "availability";

interface AdminSidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onNewEvent: () => void;
  onLogout?: () => void;
}

const AdminSidebar = ({ currentView, onViewChange, onNewEvent, onLogout }: AdminSidebarProps) => {
  return (
    <aside className="w-64 lg:w-64 w-64 bg-white border-r border-gray-200 min-h-screen p-4 lg:p-6 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800">Админ-панель</h2>
        <p className="text-sm text-gray-500">Управление системой</p>
      </div>

      <nav className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Мероприятия</p>
          <div className="space-y-1">
            <button
              onClick={() => onViewChange("overview")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "overview"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="LayoutDashboard" size={18} />
              <span className="text-sm">Обзор</span>
            </button>

            <button
              onClick={() => onViewChange("list")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "list"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="List" size={18} />
              <span className="text-sm">Все мероприятия</span>
            </button>

            <button
              onClick={() => {
                onNewEvent();
                onViewChange("add");
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "add"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="Plus" size={18} />
              <span className="text-sm">Добавить</span>
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Калькулятор</p>
          <div className="space-y-1">
            <button
              onClick={() => onViewChange("packages")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "packages"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="Package" size={18} />
              <span className="text-sm">Пакеты</span>
            </button>

            <button
              onClick={() => onViewChange("addons")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "addons"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="ShoppingBag" size={18} />
              <span className="text-sm">Дополнения</span>
            </button>

            <button
              onClick={() => onViewChange("bookings")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "bookings"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="FileText" size={18} />
              <span className="text-sm">Заявки</span>
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Настройки цен</p>
          <div className="space-y-1">
            <button
              onClick={() => onViewChange("service-areas")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "service-areas"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="MapPin" size={18} />
              <span className="text-sm">Зоны</span>
            </button>

            <button
              onClick={() => onViewChange("multipliers")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "multipliers"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="TrendingUp" size={18} />
              <span className="text-sm">Множители</span>
            </button>

            <button
              onClick={() => onViewChange("holidays")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "holidays"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="Calendar" size={18} />
              <span className="text-sm">Праздники</span>
            </button>

            <button
              onClick={() => onViewChange("promo-codes")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "promo-codes"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="Tag" size={18} />
              <span className="text-sm">Промо-коды</span>
            </button>

            <button
              onClick={() => onViewChange("settings")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "settings"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="Settings" size={18} />
              <span className="text-sm">Настройки</span>
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Занятость</p>
          <div className="space-y-1">
            <button
              onClick={() => onViewChange("availability")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                currentView === "availability"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="CalendarOff" size={18} />
              <span className="text-sm">Мои выходные</span>
            </button>
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