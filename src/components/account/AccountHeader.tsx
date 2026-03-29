import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

interface AccountHeaderProps {
  handleLogout: () => void;
}

export default function AccountHeader({ handleLogout }: AccountHeaderProps) {
  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="ArrowLeft" size={20} />
            <span className="text-sm font-medium">Главная</span>
          </Link>
          <h1 className="text-lg font-semibold">Личный кабинет</h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
        >
          <Icon name="LogOut" size={16} />
          Выйти
        </button>
      </div>
    </header>
  );
}