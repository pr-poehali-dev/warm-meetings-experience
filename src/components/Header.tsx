import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { rolesApi, UserRole } from "@/lib/roles-api";

interface NavLink {
  label: string;
  to: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "События", to: "/events" },
  { label: "Бани", to: "/principles" },
  { label: "Мастера", to: "/steam-master-guide" },
  { label: "Блог", to: "/blog" },
  { label: "О нас", to: "/organizer" },
];

interface MenuItem {
  label: string;
  to: string;
  icon: string;
  roleSlug?: string;
}

const CABINET_ITEMS: MenuItem[] = [
  { label: "Мой профиль", to: "/account", icon: "User" },
  { label: "Кабинет участника", to: "/account", icon: "Users", roleSlug: "member" },
  { label: "Кабинет мастера", to: "/account", icon: "Sparkles", roleSlug: "parmaster" },
  { label: "Кабинет организатора", to: "/organizer", icon: "Calendar", roleSlug: "organizer" },
  { label: "Кабинет партнёра", to: "/account", icon: "Home", roleSlug: "partner" },
];

interface HeaderProps {
  transparent?: boolean;
}

export default function Header({ transparent = false }: HeaderProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      rolesApi.getMyRoles().then(({ roles }) => {
        setUserRoles(roles.filter((r) => r.status === "active"));
      }).catch(() => {});
    } else {
      setUserRoles([]);
    }
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const visibleCabinets = CABINET_ITEMS.filter((item) => {
    if (!item.roleSlug) return true;
    return userRoles.some((r) => r.slug === item.roleSlug);
  });

  const isActive = (to: string) => location.pathname === to;

  const headerBase = transparent
    ? "fixed top-0 left-0 right-0 z-50 bg-transparent"
    : "sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border";

  return (
    <header className={headerBase}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className={`font-bold text-lg tracking-wide ${transparent ? "text-white" : "text-foreground"}`}>
            СПАРКОМ
          </Link>

          {/* Desktop nav */}
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

          {/* User area */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setOpen((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    transparent
                      ? "bg-white/10 border border-white/20 text-white hover:bg-white/20"
                      : "bg-muted/60 hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Icon name="User" size={13} className={transparent ? "text-white" : "text-primary"} />
                  </div>
                  <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
                  <Icon name="ChevronDown" size={14} className={`transition-transform ${open ? "rotate-180" : ""} ${transparent ? "text-white/70" : "text-muted-foreground"}`} />
                </button>

                {open && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                    <div className="px-4 py-2.5 border-b border-border">
                      <div className="text-sm font-semibold text-foreground truncate">{user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>

                    {visibleCabinets.map((item) => (
                      <Link
                        key={item.label}
                        to={item.to}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                      >
                        <Icon name={item.icon} size={16} className="text-muted-foreground flex-shrink-0" />
                        {item.label}
                      </Link>
                    ))}

                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                      >
                        <Icon name="LogOut" size={16} className="flex-shrink-0" />
                        Выйти
                      </button>
                    </div>
                  </div>
                )}
              </div>
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

            {/* Mobile burger */}
            <button
              className={`md:hidden p-2 rounded-md transition-colors ${transparent ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted"}`}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <Icon name={mobileOpen ? "X" : "Menu"} size={20} />
            </button>
          </div>
        </div>

      </div>

      {/* Mobile nav — fullscreen overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-md flex flex-col pt-20 px-4 pb-8">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
                  isActive(link.to)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-6 border-t border-border">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/5 rounded-xl transition-colors"
              >
                <Icon name="LogOut" size={16} />
                Выйти
              </button>
            ) : (
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
              >
                <Icon name="LogIn" size={16} />
                Войти
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}