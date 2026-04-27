import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { rolesApi, UserRole } from "@/lib/roles-api";

interface MenuItem {
  label: string;
  to: string;
  icon: string;
  roleSlug?: string;
}

const CABINET_ITEMS: MenuItem[] = [
  { label: "Мой профиль", to: "/account", icon: "User" },
  { label: "Мои данные", to: "/account?tab=my-data", icon: "Database" },
  { label: "Мои статьи", to: "/account?tab=articles", icon: "FileText" },
  { label: "Кабинет мастера", to: "/account?tab=calendar", icon: "Sparkles", roleSlug: "parmaster" },
  { label: "Кабинет организатора", to: "/organizer-cabinet", icon: "LayoutDashboard", roleSlug: "organizer" },
  { label: "Кабинет партнёра", to: "/account", icon: "Home", roleSlug: "partner" },
];

interface ProfileDropdownProps {
  variant?: "default" | "transparent" | "compact";
  onLogout?: () => void;
}

export default function ProfileDropdown({ variant = "default", onLogout }: ProfileDropdownProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (user) {
      rolesApi.getMyRoles().then(({ roles }) => {
        const active = roles.filter((r) => r.status === "active");
        setUserRoles(active);
        const hasAdminRole = active.some((r) => r.slug === "admin");
        setIsAdmin(hasAdminRole);
      }).catch(() => {
        setIsAdmin(false);
      });
    } else {
      setUserRoles([]);
      setIsAdmin(false);
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
  }, [location.pathname]);

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout();
      navigate("/");
    }
  };

  const visibleCabinets = CABINET_ITEMS.filter((item) => {
    if (!item.roleSlug) return true;
    return userRoles.some((r) => r.slug === item.roleSlug);
  });

  if (!user) return null;

  const isTransparent = variant === "transparent";
  const isCompact = variant === "compact";

  const buttonClass = isTransparent
    ? "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors bg-white/10 border border-white/20 text-white hover:bg-white/20"
    : isCompact
    ? "flex items-center gap-2 px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors bg-muted/60 hover:bg-muted text-foreground"
    : "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors bg-muted/60 hover:bg-muted text-foreground";

  return (
    <div ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => {
          if (!open && buttonRef.current) {
            const r = buttonRef.current.getBoundingClientRect();
            setDropdownPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
          }
          setOpen((v) => !v);
        }}
        className={buttonClass}
      >
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <Icon name="User" size={13} className={isTransparent ? "text-white" : "text-primary"} />
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
        <Icon
          name="ChevronDown"
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""} ${isTransparent ? "text-white/70" : "text-muted-foreground"}`}
        />
      </button>

      {open && (
        <div
          style={{ top: dropdownPos.top, right: Math.max(dropdownPos.right, 8) }}
          className="fixed w-56 max-w-[calc(100vw-16px)] bg-card border border-border rounded-xl shadow-xl py-1 z-[200]"
        >
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

          {isAdmin && (
            <div className="border-t border-border mt-1 pt-1">
              <Link
                to="/admin"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
              >
                <Icon name="ShieldCheck" size={16} className="text-muted-foreground flex-shrink-0" />
                Панель администратора
              </Link>
            </div>
          )}

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
  );
}