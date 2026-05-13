import { useEffect, useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import Icon from "@/components/ui/icon";
import { ViewType } from "@/types/admin";

const SUPPORT_API = "https://functions.poehali.dev/a0a86024-792f-4be0-8a06-30173c46b07a";
const ADMIN_USERS_API = "https://functions.poehali.dev/3048e78f-8bfe-4300-b910-2752590fa3ab";
const BATHS_API = "https://functions.poehali.dev/50b2bc49-0fa2-423a-9f22-9053d7808c30";

type NavItem = {
  view: ViewType;
  label: string;
  icon: string;
  group: string;
  hint?: string;
};

const NAV_ITEMS: NavItem[] = [
  { view: "overview", label: "Дашборд", icon: "LayoutDashboard", group: "События", hint: "Главный экран" },
  { view: "list", label: "Все события", icon: "List", group: "События" },
  { view: "add", label: "Создать встречу", icon: "Plus", group: "События" },
  { view: "event-signups", label: "Записи участников", icon: "ClipboardList", group: "События" },
  { view: "moderation", label: "Модерация событий", icon: "ShieldCheck", group: "События" },
  { view: "users", label: "Пользователи", icon: "Users", group: "Люди" },
  { view: "roles", label: "Заявки на роли", icon: "Shield", group: "Люди" },
  { view: "masters", label: "Мастера", icon: "Sparkles", group: "Люди" },
  { view: "support", label: "Поддержка / тикеты", icon: "LifeBuoy", group: "Люди" },
  { view: "blog", label: "Статьи блога", icon: "BookOpen", group: "Контент" },
  { view: "baths", label: "Бани", icon: "Home", group: "Контент" },
  { view: "videos", label: "Видео", icon: "Video", group: "Контент" },
  { view: "event-types", label: "Типы мероприятий", icon: "Tags", group: "Контент" },
  { view: "bookings", label: "Заявки калькулятора", icon: "FileText", group: "Бронирования" },
  { view: "packages", label: "Пакеты", icon: "Package", group: "Бронирования" },
  { view: "addons", label: "Дополнения", icon: "ShoppingBag", group: "Бронирования" },
  { view: "service-areas", label: "Зоны доставки", icon: "MapPin", group: "Цены" },
  { view: "multipliers", label: "Коэффициенты", icon: "TrendingUp", group: "Цены" },
  { view: "holidays", label: "Праздники", icon: "Calendar", group: "Цены" },
  { view: "promo-codes", label: "Промо-коды", icon: "Tag", group: "Цены" },
  { view: "availability", label: "Выходные дни", icon: "CalendarOff", group: "Цены" },
  { view: "settings", label: "Настройки сайта", icon: "SlidersHorizontal", group: "Цены" },
];

type SearchUser = { id: number; name: string; email: string };
type SearchTicket = { id: number; subject: string; status: string };
type SearchBath = { id?: number; slug?: string; name: string; city?: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: ViewType) => void;
}

export default function AdminCommandPalette({ open, onOpenChange, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [tickets, setTickets] = useState<SearchTicket[]>([]);
  const [baths, setBaths] = useState<SearchBath[]>([]);
  const [loading, setLoading] = useState(false);

  // Глобальный shortcut Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Поиск по серверу с дебаунсом
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setUsers([]);
      setTickets([]);
      setBaths([]);
      return;
    }
    const token = localStorage.getItem("admin_token") || "";
    setLoading(true);
    const t = setTimeout(async () => {
      const headers = { "X-Admin-Token": token };
      const [u, ti, ba] = await Promise.allSettled([
        fetch(`${ADMIN_USERS_API}?page=1&search=${encodeURIComponent(q)}`, { headers })
          .then((r) => r.json())
          .catch(() => ({ users: [] })),
        fetch(`${SUPPORT_API}?resource=admin-tickets`, { headers })
          .then((r) => r.json())
          .catch(() => ({ tickets: [] })),
        fetch(`${BATHS_API}?search=${encodeURIComponent(q)}`)
          .then((r) => r.json())
          .catch(() => ({ baths: [] })),
      ]);

      const uData = u.status === "fulfilled" ? u.value : { users: [] };
      const tData = ti.status === "fulfilled" ? ti.value : { tickets: [] };
      const bData = ba.status === "fulfilled" ? ba.value : { baths: [] };

      setUsers((uData?.users || []).slice(0, 6));
      const ql = q.toLowerCase();
      const allTickets: SearchTicket[] = tData?.tickets || [];
      setTickets(
        allTickets
          .filter(
            (t) =>
              t.subject?.toLowerCase().includes(ql) || String(t.id).includes(ql)
          )
          .slice(0, 5)
      );
      setBaths((bData?.baths || []).slice(0, 5));
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const navResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_ITEMS.slice(0, 8);
    return NAV_ITEMS.filter(
      (i) => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q)
    );
  }, [query]);

  const go = (view: ViewType) => {
    onNavigate(view);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Поиск: раздел, пользователь, тикет, баня…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Ищем…" : "Ничего не найдено"}
        </CommandEmpty>

        {navResults.length > 0 && (
          <CommandGroup heading="Разделы">
            {navResults.map((item) => (
              <CommandItem
                key={item.view}
                value={`nav-${item.view}-${item.label}-${item.group}`}
                onSelect={() => go(item.view)}
              >
                <Icon name={item.icon} size={14} className="mr-2 text-muted-foreground" />
                <span>{item.label}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {item.group}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {users.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Пользователи">
              {users.map((u) => (
                <CommandItem
                  key={`u-${u.id}`}
                  value={`user-${u.id}-${u.name}-${u.email}`}
                  onSelect={() => go("users")}
                >
                  <Icon name="User" size={14} className="mr-2 text-muted-foreground" />
                  <span className="truncate">{u.name || u.email}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground truncate max-w-[160px]">
                    {u.email}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {tickets.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Тикеты поддержки">
              {tickets.map((t) => (
                <CommandItem
                  key={`t-${t.id}`}
                  value={`ticket-${t.id}-${t.subject}`}
                  onSelect={() => go("support")}
                >
                  <Icon name="LifeBuoy" size={14} className="mr-2 text-muted-foreground" />
                  <span className="truncate">#{t.id} · {t.subject}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{t.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {baths.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Бани">
              {baths.map((b) => (
                <CommandItem
                  key={`b-${b.slug || b.id}`}
                  value={`bath-${b.slug}-${b.name}`}
                  onSelect={() => go("baths")}
                >
                  <Icon name="Home" size={14} className="mr-2 text-muted-foreground" />
                  <span className="truncate">{b.name}</span>
                  {b.city && (
                    <span className="ml-auto text-[11px] text-muted-foreground">{b.city}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Нажмите Enter, чтобы перейти</span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px]">⌘</kbd>
          <kbd className="ml-1 px-1.5 py-0.5 rounded border border-border bg-muted text-[10px]">K</kbd>
        </span>
      </div>
    </CommandDialog>
  );
}