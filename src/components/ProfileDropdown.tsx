import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";

interface Cabinet {
  label: string;
  description: string;
  to: string;
  icon: string;
  color: string;
  bgColor: string;
}

function getBusinessDescription(isMaster: boolean, isOrganizer: boolean, isPartner: boolean): string {
  const parts: string[] = [];
  if (isMaster) parts.push("сеансы");
  if (isOrganizer) parts.push("события");
  if (isPartner) parts.push("бани");
  if (parts.length === 0) return "Расписание и записи";
  return parts.join(" · ").replace(/^./, (c) => c.toUpperCase());
}

function buildCabinets(hasRole: (slug: string) => boolean): Cabinet[] {
  const list: Cabinet[] = [
    {
      label: "Личный кабинет",
      description: "События, избранное, профиль",
      to: "/account",
      icon: "User",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10 group-hover:bg-blue-500/20",
    },
  ];

  const isMaster = hasRole("parmaster");
  const isOrganizer = hasRole("organizer");
  const isPartner = hasRole("partner");
  if (isMaster || isOrganizer || isPartner) {
    list.push({
      label: "Моё дело",
      description: getBusinessDescription(isMaster, isOrganizer, isPartner),
      to: "/workspace",
      icon: "Briefcase",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10 group-hover:bg-orange-500/20",
    });
  }

  return list;
}

interface ProfileDropdownProps {
  variant?: "default" | "transparent" | "compact";
  onLogout?: () => void;
}

export default function ProfileDropdown({ variant = "default", onLogout }: ProfileDropdownProps) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    setOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      await logout();
      navigate("/");
    }
  };

  const visibleCabinets = buildCabinets(hasRole);

  const isAdmin = hasRole("admin");

  if (!user) return null;

  const isTransparent = variant === "transparent";
  const isCompact = variant === "compact";

  const buttonClass = isTransparent
    ? "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors bg-white/10 border border-white/20 text-white hover:bg-white/20"
    : isCompact
    ? "flex items-center gap-2 px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors bg-muted hover:bg-muted/80 border border-border"
    : "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors bg-muted hover:bg-muted/80 border border-border";

  const buttonStyle = isTransparent ? undefined : { color: "var(--header-nav-color)" };

  const currentCabinet = visibleCabinets.find((c) =>
    location.pathname === c.to || location.pathname.startsWith(c.to + "/")
  );

  return (
    <div ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => {
          if (!open && buttonRef.current) {
            const r = buttonRef.current.getBoundingClientRect();
            const dropdownH = 340;
            const spaceBelow = window.innerHeight - r.bottom;
            const top = spaceBelow >= dropdownH
              ? r.bottom + 8
              : r.top - dropdownH - 8;
            setDropdownPos({ top: Math.max(8, top), right: window.innerWidth - r.right });
          }
          setOpen((v) => !v);
        }}
        className={buttonClass}
        style={buttonStyle}
      >
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon name="User" size={13} style={isTransparent ? { color: "#fff" } : { color: "var(--header-nav-color)" }} />
          )}
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate" style={isTransparent ? undefined : { color: "var(--header-nav-color)" }}>{user.name}</span>
        <Icon
          name="ChevronDown"
          size={14}
          className={`hidden sm:block transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
          style={isTransparent ? { color: "rgba(255,255,255,0.7)" } : { color: "var(--header-nav-color)", opacity: 0.7 }}
        />
      </button>

      {open && (
        <div
          style={{ top: dropdownPos.top, right: Math.max(dropdownPos.right, 8) }}
          className="fixed w-72 max-w-[calc(100vw-16px)] bg-card border border-border rounded-2xl shadow-2xl z-[200] overflow-hidden"
        >
          {/* Шапка профиля */}
          <div className="px-4 pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden flex-shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Icon name="User" size={18} className="text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>

          {/* Кабинеты */}
          {visibleCabinets.length > 0 && (
            <div className="px-3 pb-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
                Мои кабинеты
              </div>
              <div className="space-y-1">
                {visibleCabinets.map((cabinet) => {
                  const isActive = currentCabinet?.to === cabinet.to;
                  return (
                    <Link
                      key={cabinet.to}
                      to={cabinet.to}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        isActive
                          ? "bg-muted"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${cabinet.bgColor}`}>
                        <Icon name={cabinet.icon} size={16} className={cabinet.color} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground leading-tight">{cabinet.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{cabinet.description}</div>
                      </div>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Админ */}
          {isAdmin && (
            <div className="px-3 pb-2">
              <div className="h-px bg-border mb-2" />
              <Link
                to="/admin"
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-muted/80 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Icon name="ShieldCheck" size={16} className="text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">Администратор</div>
                  <div className="text-[11px] text-muted-foreground">Управление платформой</div>
                </div>
              </Link>
            </div>
          )}

          {/* Действия */}
          <div className="border-t border-border px-3 py-2">
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <Icon name="Settings" size={15} className="flex-shrink-0" />
              Настройки профиля
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/5 transition-colors"
            >
              <Icon name="LogOut" size={15} className="flex-shrink-0" />
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}