import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import ProfileDropdown from "@/components/ProfileDropdown";

const LOGO_ON_DARK = "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/bucket/760cbfd5-821a-4526-9e92-8807a4ff87f6.png";
const LOGO_ON_LIGHT = "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/bucket/d2735e2c-6a4d-4538-b086-6156be8bd33a.png";

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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : document.documentElement.classList.contains("dark");

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
            src={isDark ? LOGO_ON_DARK : LOGO_ON_LIGHT}
            alt="Спарком"
            className="h-7 w-auto max-w-[130px]"
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