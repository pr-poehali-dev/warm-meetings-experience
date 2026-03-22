import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";

interface BlogHeaderProps {
  title?: string;
  backTo?: string;
  backLabel?: string;
}

export default function BlogHeader({ title = "Энциклопедия", backTo = "/", backLabel = "Главная" }: BlogHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link
          to={backTo}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="ArrowLeft" size={20} />
          <span className="text-sm font-medium">{backLabel}</span>
        </Link>
        <h1 className="text-lg font-semibold">{title}</h1>
        <Link
          to={user ? "/account" : "/login"}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name={user ? "User" : "LogIn"} size={18} />
          <span className="text-sm font-medium hidden sm:inline">
            {user ? user.name : "Войти"}
          </span>
        </Link>
      </div>
    </header>
  );
}
