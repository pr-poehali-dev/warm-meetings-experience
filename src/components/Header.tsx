import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import ProfileDropdown from "@/components/ProfileDropdown";
import ThemeToggle from "@/components/ThemeToggle";

const SBER_DONATE_URL = "https://messenger.online.sberbank.ru/sl/9eE3EK9SoMLSsYC2x";

// LOGO_ON_DARK — светлый логотип для тёмных поверхностей (тёмная тема, hero)
// LOGO_ON_LIGHT — тёмный логотип для светлых поверхностей (светлая тема)
const LOGO_ON_DARK = "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/bucket/760cbfd5-821a-4526-9e92-8807a4ff87f6.png";
const LOGO_ON_LIGHT = "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/bucket/d2735e2c-6a4d-4538-b086-6156be8bd33a.png";

const MOBILE_CABINETS = [
  { label: "Личный кабинет", to: "/account", icon: "User" },
  { label: "Рабочий кабинет", to: "/workspace", icon: "Briefcase", roleSlugAny: ["parmaster", "organizer"] },
  { label: "Кабинет управляющего", to: "/partner", icon: "Building2", roleSlug: "partner" },
  { label: "Администратор", to: "/admin", icon: "ShieldCheck", roleSlug: "admin" },
];

interface NavLink {
  label: string;
  to: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "События", to: "/events" },
  { label: "Бани", to: "/baths" },
  { label: "Мастера", to: "/masters" },
  { label: "Блог", to: "/blog" },
  { label: "О нас", to: "/about" },
];

interface HeaderProps {
  transparent?: boolean;
}

export default function Header({ transparent = false }: HeaderProps) {
  const { user, logout, hasRole } = useAuth();
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDarkTheme = mounted ? resolvedTheme === "dark" : document.documentElement.classList.contains("dark");

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!transparent) return;
    setHeroVisible(true);

    const hero = document.querySelector("[data-hero]") as HTMLElement | null;
    if (!hero) {
      setHeroVisible(false);
      return;
    }

    const obs = new IntersectionObserver(
      ([e]) => setHeroVisible(e.isIntersecting),
      { threshold: 0.05 },
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, [transparent, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isActive = (to: string) => location.pathname === to;

  // onHero = поверх тёмного hero → белый текст, прозрачный фон
  // offHero = прокрутили дальше → залипающий хедер с фоном как обычно
  const onHero = transparent && heroVisible;

  const headerBase = transparent
    ? `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        onHero
          ? "bg-transparent"
          : "bg-card/95 backdrop-blur-md border-b border-border"
      }`
    : "sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border";

  return (
    <>
      <header className={headerBase}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-3 h-16 min-w-0">
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity duration-300 shrink min-w-0 overflow-hidden">
              <img
                src={isDarkTheme ? LOGO_ON_DARK : LOGO_ON_LIGHT}
                alt="Спарком"
                className="h-6 sm:h-7 w-auto max-w-full object-contain object-left"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300"
                  style={isActive(link.to)
                    ? { background: "var(--header-nav-hover-bg)", color: "var(--header-nav-active)" }
                    : { color: "var(--header-nav-color)" }
                  }
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href="https://messenger.online.sberbank.ru/sl/9eE3EK9SoMLSsYC2x"
                target="_blank"
                rel="noopener noreferrer"
                title="Поддержать клуб"
                aria-label="Поддержать клуб"
                className={`hidden sm:inline-flex p-2 rounded-full transition-colors ${
                  onHero
                    ? "text-white/90 hover:text-white hover:bg-white/10"
                    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                }`}
              >
                <Icon name="Heart" size={20} />
              </a>

              <div className={`hidden md:block ${onHero ? "opacity-70 hover:opacity-100" : ""} transition-opacity`}>
                <ThemeToggle compact />
              </div>

              {user ? (
                <ProfileDropdown variant="default" />
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300"
                  style={{
                    background: "var(--header-login-bg)",
                    border: "1px solid var(--header-login-border)",
                    color: "var(--header-nav-color)",
                  }}
                >
                  <Icon name="LogIn" size={16} />
                  <span className="hidden sm:inline">Войти</span>
                </Link>
              )}

              <button
                className={`md:hidden p-2 rounded-md transition-colors duration-300 ${
                  onHero
                    ? "text-white hover:bg-white/10"
                    : "text-foreground hover:bg-muted"
                }`}
                onClick={() => setMobileOpen((v) => !v)}
              >
                <Icon name={mobileOpen ? "X" : "Menu"} size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[200] bg-background/97 backdrop-blur-xl flex flex-col px-4 pb-8"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="flex items-center justify-between h-16 flex-shrink-0">
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img
                src={isDarkTheme ? LOGO_ON_DARK : LOGO_ON_LIGHT}
                alt="Спарком"
                className="h-7 w-auto object-contain object-left"
              />
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
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
                    ? "bg-primary/15 text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border py-1">
            <a
              href={SBER_DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <span className="flex items-center gap-3">
                <Icon name="Heart" size={18} className="text-emerald-500" />
                Поддержать клуб
              </span>
              <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
            </a>
          </div>
          <div className="px-4 py-3 flex items-center justify-between border-t border-border">
            <span className="text-xs text-muted-foreground font-medium">Тема оформления</span>
            <ThemeToggle />
          </div>
          <div className="mt-auto pt-2 border-t border-border space-y-1">
            {user ? (
              <>
                <div className="px-4 py-2">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Мои кабинеты</div>
                  <div className="space-y-0.5">
                    {MOBILE_CABINETS.filter((c) => {
                      if (c.roleSlugAny) return c.roleSlugAny.some((r) => hasRole(r));
                      if (c.roleSlug) return hasRole(c.roleSlug);
                      return true;
                    }).map((c) => (
                      <Link
                        key={c.to}
                        to={c.to}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                          location.pathname === c.to
                            ? "bg-primary/15 text-primary"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon name={c.icon} size={16} />
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border pt-2 px-4 pb-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-colors"
                  >
                    <Icon name="LogOut" size={16} />
                    Выйти
                  </button>
                </div>
              </>
            ) : (
              <div className="px-4 pb-4">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors"
                >
                  <Icon name="LogIn" size={16} />
                  Войти
                </Link>
              </div>
            )}
          </div>
        </div>
      )}


    </>
  );
}