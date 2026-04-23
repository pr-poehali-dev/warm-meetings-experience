import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";

// ─── Общие mock-данные ────────────────────────────────────────────────────────

const mockUser = {
  name: "Алексей Смирнов",
  email: "a***@gmail.com",
  phone: "+7 (***) ***-**-89",
  telegram: "@alexsmv",
  avatar: "АС",
  vk: true,
  yandex: false,
  tg: true,
};

const mockSignups = [
  { id: 1, title: "Баня с паром и медитацией", date: "28 апр", time: "11:00", status: "confirmed", color: "bg-amber-100" },
  { id: 2, title: "Зимняя баня + прорубь", date: "14 мая", time: "09:00", status: "pending", color: "bg-blue-100" },
  { id: 3, title: "Вечер расслабления", date: "2 мар", time: "19:00", status: "attended", color: "bg-green-100" },
];

const statusLabel: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Подтверждено", color: "bg-green-100 text-green-700" },
  pending: { label: "Ожидание", color: "bg-amber-100 text-amber-700" },
  attended: { label: "Посетил", color: "bg-slate-100 text-slate-600" },
};

// ─── Переиспользуемые mock-блоки ─────────────────────────────────────────────

function MockAvatar({ size = "lg" }: { size?: "sm" | "lg" }) {
  const s = size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-sm";
  return (
    <div className={`${s} rounded-full bg-primary/15 flex items-center justify-center font-semibold text-primary flex-shrink-0`}>
      {mockUser.avatar}
    </div>
  );
}

function MockField({ label, value, verified }: { label: string; value: string; verified?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {value}
        {verified && <Icon name="CheckCircle" size={13} className="text-green-500" />}
      </div>
    </div>
  );
}

function MockSocialRow({ icon, label, connected, color }: { icon: string; label: string; connected: boolean; color: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center`}>
          <Icon name={icon as "Users"} size={13} className="text-white" />
        </div>
        <span className="text-sm">{label}</span>
      </div>
      {connected
        ? <span className="text-xs text-green-600 flex items-center gap-1"><Icon name="Check" size={12} />Привязан</span>
        : <Button size="sm" variant="outline" className="h-7 text-xs px-2">Привязать</Button>}
    </div>
  );
}

function MockNotifyRow({ icon, label, active, hint }: { icon: string; label: string; active: boolean; hint?: string }) {
  const [on, setOn] = useState(active);
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2.5">
        <Icon name={icon as "Mail"} size={15} className={on ? "text-primary" : "text-muted-foreground"} />
        <div>
          <div className="text-sm">{label}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  );
}

function MockEventCard({ event }: { event: typeof mockSignups[0] }) {
  const st = statusLabel[event.status];
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className={`w-10 h-10 rounded-lg ${event.color} flex items-center justify-center flex-shrink-0`}>
        <Icon name="Flame" size={18} className="text-amber-700" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{event.title}</div>
        <div className="text-xs text-muted-foreground">{event.date} · {event.time}</div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${st.color}`}>{st.label}</span>
    </div>
  );
}

// ─── ВАРИАНТ А: Вкладки внутри страницы ──────────────────────────────────────

const tabsA = [
  { key: "profile", label: "Профиль", icon: "User" },
  { key: "signups", label: "Мои события", icon: "Calendar" },
  { key: "notify", label: "Уведомления", icon: "Bell" },
  { key: "security", label: "Безопасность", icon: "Shield" },
];

function VariantA() {
  const [tab, setTab] = useState("profile");

  return (
    <div className="max-w-lg mx-auto">
      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <MockAvatar />
        <div>
          <div className="font-semibold text-lg">{mockUser.name}</div>
          <div className="text-sm text-muted-foreground">{mockUser.email}</div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4">
        {tabsA.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
              tab === t.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={t.icon as "User"} size={15} />
            <span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Контент */}
      {tab === "profile" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MockField label="Имя" value={mockUser.name} />
              <MockField label="Телефон" value={mockUser.phone} />
              <MockField label="Email" value={mockUser.email} verified />
              <MockField label="Telegram" value={mockUser.telegram} />
            </div>
            <Button size="sm" variant="outline" className="w-full">
              <Icon name="Pencil" size={14} className="mr-2" />Редактировать
            </Button>
            <div className="border-t pt-3 space-y-0 divide-y divide-border">
              <MockSocialRow icon="Users" label="ВКонтакте" connected={mockUser.vk} color="bg-blue-500" />
              <MockSocialRow icon="Send" label="Telegram" connected={mockUser.tg} color="bg-sky-500" />
              <MockSocialRow icon="Globe" label="Яндекс ID" connected={mockUser.yandex} color="bg-yellow-500" />
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "signups" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Мои записи</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {mockSignups.map((e) => <MockEventCard key={e.id} event={e} />)}
          </CardContent>
        </Card>
      )}

      {tab === "notify" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Каналы уведомлений</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 divide-y divide-border">
            <MockNotifyRow icon="Mail" label="Email" active={true} hint={mockUser.email} />
            <MockNotifyRow icon="Send" label="Telegram" active={true} hint="@alexsmv" />
            <MockNotifyRow icon="Users" label="ВКонтакте" active={false} hint="Привязан, но выключен" />
            <MockNotifyRow icon="Smartphone" label="SMS" active={false} hint="Только срочные" />
          </CardContent>
        </Card>
      )}

      {tab === "security" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <div className="text-sm font-medium">Пароль</div>
                <div className="text-xs text-muted-foreground">Установлен</div>
              </div>
              <Button size="sm" variant="outline">Изменить</Button>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <div className="text-sm font-medium">Двухфакторный вход</div>
                <div className="text-xs text-muted-foreground">Через Telegram</div>
              </div>
              <span className="text-xs text-green-600 flex items-center gap-1"><Icon name="ShieldCheck" size={13} />Включён</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium">Приложение-аутентификатор</div>
                <div className="text-xs text-muted-foreground">Google/Yandex Auth</div>
              </div>
              <Button size="sm" variant="outline">Настроить</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── ВАРИАНТ Б: Двухколоночный layout с боковым меню ─────────────────────────

const sideNavB = [
  { key: "signups", label: "Мои события", icon: "Calendar", badge: "3" },
  { key: "profile", label: "Профиль", icon: "User" },
  { key: "notify", label: "Уведомления", icon: "Bell", dot: true },
  { key: "security", label: "Безопасность", icon: "Shield" },
  { key: "data", label: "Мои данные", icon: "Download" },
];

function VariantB() {
  const [section, setSection] = useState("signups");

  return (
    <div className="max-w-2xl mx-auto flex gap-4">
      {/* Боковое меню */}
      <div className="w-48 flex-shrink-0 space-y-1">
        <div className="flex flex-col items-center py-4 px-3 mb-2 bg-card rounded-xl border border-border">
          <MockAvatar />
          <div className="mt-2 font-semibold text-sm text-center">{mockUser.name}</div>
          <div className="text-xs text-muted-foreground text-center mt-0.5">Гость</div>
        </div>
        {sideNavB.map((item) => (
          <button
            key={item.key}
            onClick={() => setSection(item.key)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
              section === item.key
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon name={item.icon as "User"} size={16} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                {item.badge}
              </span>
            )}
            {item.dot && <span className="w-2 h-2 rounded-full bg-amber-400" />}
          </button>
        ))}
        <div className="pt-2">
          <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all">
            <Icon name="LogOut" size={16} />
            Выйти
          </button>
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 min-w-0">
        {section === "signups" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Мои записи</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {mockSignups.map((e) => <MockEventCard key={e.id} event={e} />)}
              <Button variant="outline" size="sm" className="w-full mt-3">Все прошедшие</Button>
            </CardContent>
          </Card>
        )}

        {section === "profile" && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <MockAvatar />
                <div className="flex-1">
                  <div className="font-semibold">{mockUser.name}</div>
                  <div className="text-xs text-muted-foreground">Участник с марта 2024</div>
                </div>
                <Button size="sm" variant="outline">
                  <Icon name="Pencil" size={13} className="mr-1.5" />Изменить
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MockField label="Email" value={mockUser.email} verified />
                <MockField label="Телефон" value={mockUser.phone} />
                <MockField label="Telegram" value={mockUser.telegram} />
              </div>
              <div className="border-t pt-3">
                <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Способы входа</div>
                <div className="divide-y divide-border">
                  <MockSocialRow icon="Users" label="ВКонтакте" connected={mockUser.vk} color="bg-blue-500" />
                  <MockSocialRow icon="Send" label="Telegram" connected={mockUser.tg} color="bg-sky-500" />
                  <MockSocialRow icon="Globe" label="Яндекс ID" connected={mockUser.yandex} color="bg-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {section === "notify" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Уведомления</CardTitle>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Настройте хотя бы 1 канал</span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 divide-y divide-border">
              <MockNotifyRow icon="Mail" label="Email" active={true} hint={mockUser.email} />
              <MockNotifyRow icon="Send" label="Telegram" active={true} hint="@alexsmv" />
              <MockNotifyRow icon="Users" label="ВКонтакте" active={false} hint="Привязан, но выключен" />
              <MockNotifyRow icon="Smartphone" label="SMS" active={false} hint="Только срочные" />
            </CardContent>
          </Card>
        )}

        {section === "security" && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-0 divide-y divide-border">
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">Пароль</div>
                  <div className="text-xs text-muted-foreground">Последнее изменение 2 месяца назад</div>
                </div>
                <Button size="sm" variant="outline">Изменить</Button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">Двухфакторный вход</div>
                  <div className="text-xs text-green-600 flex items-center gap-1 mt-0.5"><Icon name="ShieldCheck" size={12} />Через Telegram</div>
                </div>
                <Button size="sm" variant="outline">Изменить</Button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">TOTP-аутентификатор</div>
                  <div className="text-xs text-muted-foreground">Google/Yandex Auth</div>
                </div>
                <Button size="sm" variant="outline">Настроить</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {section === "data" && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-4">Скачайте все данные, которые платформа хранит о вас.</p>
              <Button variant="outline"><Icon name="Download" size={15} className="mr-2" />Скачать мои данные</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── ВАРИАНТ В: Смарт-карточки (скролл + приоритеты) ─────────────────────────

function VariantC() {
  const [editingProfile, setEditingProfile] = useState(false);

  return (
    <div className="max-w-lg mx-auto space-y-3">
      {/* Шапка-визитка */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-5">
        <div className="flex items-center gap-4">
          <MockAvatar size="lg" />
          <div className="flex-1">
            <div className="font-semibold text-lg">{mockUser.name}</div>
            <div className="text-sm text-muted-foreground">{mockUser.email}</div>
            <div className="flex gap-1.5 mt-2">
              {mockUser.vk && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">VK</span>}
              {mockUser.tg && <span className="text-xs bg-sky-500 text-white px-2 py-0.5 rounded-full">TG</span>}
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Email ✓</span>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEditingProfile(!editingProfile)}>
            <Icon name="Pencil" size={15} />
          </Button>
        </div>
        {editingProfile && (
          <div className="mt-4 pt-4 border-t border-primary/20 grid grid-cols-2 gap-2">
            {["Имя", "Телефон", "Email", "Telegram"].map((f) => (
              <div key={f} className="bg-background rounded-lg px-3 py-2">
                <div className="text-xs text-muted-foreground">{f}</div>
                <div className="text-sm text-muted-foreground italic">нажмите для изменения</div>
              </div>
            ))}
            <div className="col-span-2 flex gap-2">
              <Button size="sm" className="flex-1">Сохранить</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)}>Отмена</Button>
            </div>
          </div>
        )}
      </div>

      {/* Ближайшие события — на первом месте */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-1 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ближайшие события</CardTitle>
            <button className="text-xs text-primary hover:underline">Все →</button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {mockSignups.filter(e => e.status !== "attended").map((e) => (
            <MockEventCard key={e.id} event={e} />
          ))}
        </CardContent>
      </Card>

      {/* Быстрые действия */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Icon name="Bell" size={15} className="text-amber-600" />
            </div>
            <span className="text-sm font-medium">Уведомления</span>
          </div>
          <p className="text-xs text-muted-foreground">2 канала активны</p>
          <Button size="sm" variant="outline" className="mt-auto">Настроить</Button>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <Icon name="Shield" size={15} className="text-green-600" />
            </div>
            <span className="text-sm font-medium">Безопасность</span>
          </div>
          <p className="text-xs text-green-600 flex items-center gap-1"><Icon name="CheckCircle" size={11} />Всё настроено</p>
          <Button size="sm" variant="outline" className="mt-auto">Изменить</Button>
        </div>
      </div>

      {/* Способы входа и связи */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-1 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Привязанные аккаунты</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 divide-y divide-border">
          <MockSocialRow icon="Users" label="ВКонтакте" connected={mockUser.vk} color="bg-blue-500" />
          <MockSocialRow icon="Send" label="Telegram" connected={mockUser.tg} color="bg-sky-500" />
          <MockSocialRow icon="Globe" label="Яндекс ID" connected={mockUser.yandex} color="bg-yellow-500" />
        </CardContent>
      </Card>

      {/* Прошедшие события — в конце */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-1 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Посещённые события</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {mockSignups.filter(e => e.status === "attended").map((e) => (
            <MockEventCard key={e.id} event={e} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Обёртка-переключатель ────────────────────────────────────────────────────

const variants = [
  {
    key: "a",
    label: "Вариант А",
    sub: "Вкладки вверху",
    desc: "Минимум изменений. Всё разложено по 4 вкладкам. Привычно как в мобильных приложениях.",
    pros: ["Просто освоить", "Одно действие = одна вкладка", "Отлично на мобиле"],
    cons: ["Нет обзора всего сразу"],
  },
  {
    key: "b",
    label: "Вариант Б",
    sub: "Боковое меню",
    desc: "Классический desktop-кабинет. Навигация слева, контент справа. Хорошо работает на планшете и ПК.",
    pros: ["Всё видно сразу в меню", "Бейджи и статусы в навигации", "Масштабируется"],
    cons: ["На мобиле нужна адаптация"],
  },
  {
    key: "c",
    label: "Вариант В",
    sub: "Смарт-карточки",
    desc: "Одна колонка, но с умным приоритетом: события — первыми, безопасность — карточкой с статусом.",
    pros: ["Минимум кликов", "События на виду", "Карточки = понятный порядок"],
    cons: ["Длинный скролл если много событий"],
  },
];

export default function AccountDemo() {
  const [active, setActive] = useState<"a" | "b" | "c">("a");
  const v = variants.find((x) => x.key === active)!;

  return (
    <div className="min-h-screen bg-background">
      {/* Шапка */}
      <div className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="ArrowLeft" size={18} />
          </a>
          <span className="font-medium text-sm">Демо: варианты личного кабинета</span>
          <div className="ml-auto flex gap-1.5 bg-muted rounded-lg p-1">
            {variants.map((v) => (
              <button
                key={v.key}
                onClick={() => setActive(v.key as "a" | "b" | "c")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  active === v.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Описание варианта */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{v.label}:</span>
                <span className="text-muted-foreground">{v.sub}</span>
              </div>
              <p className="text-sm text-muted-foreground">{v.desc}</p>
            </div>
            <div className="flex gap-4 text-xs flex-shrink-0">
              <div>
                <div className="text-green-600 font-medium mb-1">Плюсы</div>
                {v.pros.map((p) => <div key={p} className="text-muted-foreground flex items-center gap-1"><Icon name="Plus" size={10} className="text-green-500" />{p}</div>)}
              </div>
              <div>
                <div className="text-amber-600 font-medium mb-1">Нюансы</div>
                {v.cons.map((c) => <div key={c} className="text-muted-foreground flex items-center gap-1"><Icon name="Minus" size={10} className="text-amber-500" />{c}</div>)}
              </div>
            </div>
          </div>
        </div>

        {/* Демо */}
        <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-4 sm:p-6">
          <div className="text-xs text-muted-foreground text-center mb-5 uppercase tracking-widest">Превью</div>
          {active === "a" && <VariantA />}
          {active === "b" && <VariantB />}
          {active === "c" && <VariantC />}
        </div>

        {/* CTA */}
        <div className="text-center pb-4">
          <p className="text-sm text-muted-foreground mb-3">Понравился вариант? Скажи — сразу реализую в настоящем кабинете.</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {variants.map((v) => (
              <Button
                key={v.key}
                variant={active === v.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActive(v.key as "a" | "b" | "c")}
              >
                Выбрать {v.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
