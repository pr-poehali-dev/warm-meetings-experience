import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import ProfileDropdown from "@/components/ProfileDropdown";

interface NavLink {
  label: string;
  to: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "Встречи", to: "/events" },
  { label: "Бани", to: "/baths" },
  { label: "Мастера", to: "/steam-master-guide" },
  { label: "Блог", to: "/blog" },
  { label: "О нас", to: "/organizer" },
];

interface HeaderProps {
  transparent?: boolean;
}

export default function Header({ transparent = false }: HeaderProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isActive = (to: string) => location.pathname === to;

  const headerBase = transparent
    ? "fixed top-0 left-0 right-0 z-50 bg-transparent"
    : "sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border";

  return (
    <>
    <header className={headerBase}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className={`font-bold text-lg tracking-wide ${transparent ? "text-white" : "text-foreground"}`}>
            СПАРКОМ
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  transparent
                    ? isActive(link.to)
                      ? "bg-white/20 text-white"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                    : isActive(link.to)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <ProfileDropdown variant={transparent ? "transparent" : "default"} />
            ) : (
              <Link
                to="/login"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  transparent
                    ? "bg-white/10 border border-white/20 text-white hover:bg-white/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                <Icon name="LogIn" size={16} />
                <span className="hidden sm:inline">Войти</span>
              </Link>
            )}

            <button
              className={`md:hidden p-2 rounded-md transition-colors ${transparent ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted"}`}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <Icon name={mobileOpen ? "X" : "Menu"} size={20} />
            </button>
          </div>
        </div>

      </div>

    </header>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[200] bg-foreground/80 backdrop-blur-md flex flex-col px-4 pb-8" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
          <div className="flex items-center justify-between h-16 flex-shrink-0">
            <span className="font-bold text-lg text-white tracking-wide">СПАРКОМ</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Icon name="X" size={22} />
            </button>
          </div>
          <nav className="flex flex-col gap-1 mt-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
                  isActive(link.to)
                    ? "bg-white/25 text-white"
                    : "text-white/90 hover:bg-white/15 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-6 border-t border-white/20">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
              >
                <Icon name="LogOut" size={16} />
                Выйти
              </button>
            ) : (
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Icon name="LogIn" size={16} />
                Войти
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
