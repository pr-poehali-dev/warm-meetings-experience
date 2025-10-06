import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

interface AdminSidebarProps {
  currentView: "overview" | "list" | "add";
  onViewChange: (view: "overview" | "list" | "add") => void;
  onNewEvent: () => void;
}

const AdminSidebar = ({ currentView, onViewChange, onNewEvent }: AdminSidebarProps) => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-6">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800">Админ-панель</h2>
        <p className="text-sm text-gray-500">Управление мероприятиями</p>
      </div>

      <nav className="space-y-2">
        <button
          onClick={() => onViewChange("overview")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === "overview"
              ? "bg-nature-moss text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Icon name="LayoutDashboard" size={20} />
          <span>Обзор</span>
        </button>

        <button
          onClick={() => onViewChange("list")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === "list"
              ? "bg-nature-moss text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Icon name="List" size={20} />
          <span>Все мероприятия</span>
        </button>

        <button
          onClick={() => {
            onNewEvent();
            onViewChange("add");
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === "add"
              ? "bg-nature-moss text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Icon name="Plus" size={20} />
          <span>Добавить мероприятие</span>
        </button>

        <div className="pt-6 mt-6 border-t border-gray-200">
          <Link
            to="/events"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Icon name="ArrowLeft" size={20} />
            <span>На сайт</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
