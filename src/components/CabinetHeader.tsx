import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import ProfileDropdown from "@/components/ProfileDropdown";

interface CabinetHeaderProps {
  icon: string;
  title: string;
  subtitle?: string;
  iconBgClass?: string;
  iconColorClass?: string;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
  actions?: React.ReactNode;
  onLogout?: () => void;
}

export default function CabinetHeader({
  icon,
  title,
  subtitle,
  iconBgClass = "bg-primary/10",
  iconColorClass = "text-primary",
  onMenuToggle,
  menuOpen,
  actions,
  onLogout,
}: CabinetHeaderProps) {
  return (
    <header className="border-b bg-card/95 backdrop-blur sticky top-0 z-40">
      <div className="flex items-center gap-3 px-4 h-14">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted transition"
          >
            <Icon name={menuOpen ? "X" : "Menu"} size={20} />
          </button>
        )}

        <Link to="/" className="flex items-center hover:opacity-80 transition shrink-0">
          <img
            src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/bucket/e7f1ef5a-7323-4d3a-9a22-3a19e538df7d.png"
            alt="Спарком"
            className="h-7 w-auto"
          />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {actions}
          <ProfileDropdown onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}