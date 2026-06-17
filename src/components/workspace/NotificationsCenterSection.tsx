import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import TelegramSettings from "@/components/organizer/TelegramSettings";
import VkConnectBanner from "@/components/shared/VkConnectBanner";
import {
  notifyCenterApi,
  NotifyCenterState,
  CenterChannel,
  CenterEvent,
} from "@/lib/notify-api";

const CHANNEL_META: Record<CenterChannel, { label: string; icon: string; color: string }> = {
  telegram: { label: "Telegram", icon: "Send", color: "text-sky-500" },
  email: { label: "Email", icon: "Mail", color: "text-blue-500" },
  vk: { label: "ВКонтакте", icon: "MessageCircle", color: "text-indigo-500" },
};

const CATEGORY_LABEL: Record<string, string> = {
  booking: "Записи и заявки",
  reminder: "Напоминания",
  service: "Служебные",
};

export interface UserOption {
  id: number;
  name: string;
  role?: string;
}

interface Props {
  masterId: number;
  userRole: "organizer" | "master" | "partner";
  tgLinked: boolean;
  tgChannelsCount: number;
  refreshTgInfo: () => void;
  userOptions?: UserOption[];
  selectedUserId?: number;
  onUserChange?: (userId: number) => void;
}

export default function NotificationsCenterSection({
  masterId,
  userRole,
  tgLinked,
  tgChannelsCount,
  refreshTgInfo,
  userOptions,
  selectedUserId,
  onUserChange,
}: Props) {
  const [state, setState] = useState<NotifyCenterState | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState<"telegram" | "vk" | "email" | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    notifyCenterApi
      .get()
      .then(setState)
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  if (!state) return null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Icon name="Bell" size={22} className="text-violet-500" />
          Центр уведомлений
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Подключите каналы и выберите, о чём вас уведомлять
        </p>
      </div>

      {/* ── Выбор пользователя (если передан список) ── */}
      {userOptions && userOptions.length > 1 && onUserChange && (
        <div className="flex items-center gap-3">
          <Icon name="User" size={15} className="text-muted-foreground shrink-0" />
          <Select
            value={String(selectedUserId ?? masterId)}
            onValueChange={(v) => onUserChange(Number(v))}
          >
            <SelectTrigger className="w-full sm:w-72 rounded-xl border-border bg-card h-9 text-sm">
              <SelectValue placeholder="Выберите пользователя" />
            </SelectTrigger>
            <SelectContent>
              {userOptions.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  <span className="font-medium">{u.name}</span>
                  {u.role && (
                    <span className="ml-2 text-xs text-muted-foreground">{u.role}</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Верхняя панель: статусы каналов ── */}
      <ChannelsPanel
        state={state}
        onToggle={async (ch, active) => {
          try {
            await notifyCenterApi.setChannel(ch, active);
            setState((p) =>
              p ? { ...p, channels: { ...p.channels, [ch]: { ...p.channels[ch], active } } } : p
            );
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
        onOpenWizard={(ch) => setWizard(ch)}
      />

      {/* ── Мастер подключения Telegram ── */}
      {wizard === "telegram" && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Icon name="Wand2" size={15} className="text-sky-500" />
              Подключение Telegram
            </h3>
            <button
              onClick={() => setWizard(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon name="X" size={18} />
            </button>
          </div>
          <TelegramSettings
            tgLinked={tgLinked}
            tgChannelsCount={tgChannelsCount}
            userId={masterId}
            onRefresh={() => {
              refreshTgInfo();
              load();
            }}
            userRole={userRole}
          />
        </div>
      )}

      {/* ── Мастер подключения ВКонтакте ── */}
      {wizard === "vk" && (
        <div className="rounded-2xl border border-[#b8cff7] bg-[#e8f0fc]/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Icon name="Wand2" size={15} className="text-[#0077FF]" />
              Подключение ВКонтакте
            </h3>
            <button
              onClick={() => setWizard(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon name="X" size={18} />
            </button>
          </div>
          <ol className="text-xs text-[#4a5c8a] space-y-1 list-decimal pl-4">
            <li>Привяжите VK-аккаунт через кнопку ниже (один клик).</li>
            <li>Напишите сообществу одно сообщение — это разрешит нам отправлять уведомления вам в личку.</li>
          </ol>
          <VkConnectBanner vkId={state.channels.vk.vk_id} variant="inline" />
          <Button size="sm" variant="ghost" onClick={load} className="gap-1.5">
            <Icon name="RefreshCw" size={13} />
            Я подключил — проверить
          </Button>
        </div>
      )}

      {/* ── Мастер подключения Email ── */}
      {wizard === "email" && (
        <EmailWizard
          currentEmail={state.channels.email.value || null}
          onClose={() => setWizard(null)}
        />
      )}

      {/* ── Нижняя панель: события × каналы ── */}
      <EventsPanel
        events={state.events}
        userRoles={state.user_roles ?? []}
        onChange={(updated) =>
          setState((p) =>
            p
              ? {
                  ...p,
                  events: p.events.map((e) =>
                    e.event_type === updated.event_type ? updated : e
                  ),
                }
              : p
          )
        }
      />

      {/* ── Расписание: тихие часы ── */}
      <SchedulePanel
        schedule={state.schedule}
        onChange={(sch) => setState((p) => (p ? { ...p, schedule: sch } : p))}
      />
    </div>
  );
}

// ─── Верхняя панель: каналы ───────────────────────────────────────────────────

function ChannelsPanel({
  state,
  onToggle,
  onOpenWizard,
}: {
  state: NotifyCenterState;
  onToggle: (ch: CenterChannel, active: boolean) => void;
  onOpenWizard: (ch: CenterChannel) => void;
}) {
  const channels = Object.keys(CHANNEL_META) as CenterChannel[];
  // Все каналы имеют мастер подключения
  const hasWizard = (_ch: CenterChannel) => true;
  return (
    <div className="space-y-2">
      <p className="font-semibold text-sm">Каналы получения</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {channels.map((ch) => {
          const meta = CHANNEL_META[ch];
          const st = state.channels[ch];
          const clickable = hasWizard(ch);
          return (
            <div
              key={ch}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onOpenWizard(ch) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenWizard(ch);
                      }
                    }
                  : undefined
              }
              className={`bg-card border rounded-2xl p-4 flex items-center gap-3 transition-colors ${
                clickable
                  ? "cursor-pointer hover:border-sky-300 hover:bg-sky-50/40 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  : ""
              }`}
            >
              <Icon name={meta.icon} size={18} className={`${meta.color} shrink-0`} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">{meta.label}</div>
                <div className="text-xs">
                  {st.connected ? (
                    <span className="text-green-600">Подключён</span>
                  ) : clickable ? (
                    <span className="text-sky-600">Подключить →</span>
                  ) : (
                    <span className="text-muted-foreground">Не подключён</span>
                  )}
                </div>
              </div>
              {/* клик по тумблеру не должен открывать мастер */}
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={st.active && st.connected}
                  disabled={!st.connected}
                  onCheckedChange={(v) => onToggle(ch, v)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Нижняя панель: события × каналы ──────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  master: "Мастер",
  organizer: "Организатор",
  partner: "Управляющий",
};

const ROLE_STYLE: Record<string, { icon: string; accent: string; bg: string; border: string; badge: string }> = {
  master:    { icon: "Flame",        accent: "text-orange-500", bg: "bg-orange-500/[0.04]",  border: "border-orange-500/20", badge: "bg-orange-500/10 text-orange-700" },
  organizer: { icon: "CalendarDays", accent: "text-emerald-500", bg: "bg-emerald-500/[0.04]", border: "border-emerald-500/20", badge: "bg-emerald-500/10 text-emerald-700" },
  partner:   { icon: "Building2",    accent: "text-violet-500", bg: "bg-violet-500/[0.04]",  border: "border-violet-500/20", badge: "bg-violet-500/10 text-violet-700" },
};

function EventsTable({
  events,
  onChange,
}: {
  events: CenterEvent[];
  onChange: (e: CenterEvent) => void;
}) {
  const allChannels: CenterChannel[] = ["telegram", "email", "vk"];

  const saveSub = async (
    ev: CenterEvent,
    next: { enabled?: boolean; channels?: Record<string, boolean> }
  ) => {
    const updated: CenterEvent = {
      ...ev,
      enabled: next.enabled ?? ev.enabled,
      channels: { ...ev.channels, ...(next.channels || {}) },
    };
    onChange(updated);
    try {
      await notifyCenterApi.setEventSub(ev.event_type, updated.enabled, updated.channels);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const groups: Record<string, CenterEvent[]> = {};
  events.forEach((e) => {
    (groups[e.category] = groups[e.category] || []).push(e);
  });

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      {/* шапка */}
      <div className="hidden sm:grid grid-cols-[1fr_auto] gap-2 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
        <div>Событие</div>
        <div className="flex gap-1">
          {allChannels.map((ch) => (
            <span key={ch} className="w-20 text-center">
              {CHANNEL_META[ch].label}
            </span>
          ))}
        </div>
      </div>

      {Object.entries(groups).map(([cat, list]) => (
        <div key={cat}>
          <div className="px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
            {CATEGORY_LABEL[cat] || cat}
          </div>
          {list.map((ev) => (
            <div
              key={ev.event_type}
              className="px-4 py-3 border-b last:border-0 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Switch
                  checked={ev.enabled}
                  onCheckedChange={(v) => saveSub(ev, { enabled: v })}
                />
                <div className="min-w-0">
                  <div className={`text-sm font-medium ${!ev.enabled ? "text-muted-foreground" : ""}`}>
                    {ev.name}
                  </div>
                  {ev.description && (
                    <div className="text-xs text-muted-foreground truncate">{ev.description}</div>
                  )}
                </div>
              </div>

              <div className="flex gap-1 pl-11 sm:pl-0">
                {allChannels.map((ch) => {
                  const available = ev.available_channels.includes(ch);
                  const checked = available && ev.enabled && ev.channels[ch] !== false;
                  return (
                    <div key={ch} className="w-20 flex flex-col items-center gap-1">
                      <span className={`text-[10px] font-medium ${CHANNEL_META[ch].color} sm:hidden`}>
                        {CHANNEL_META[ch].label}
                      </span>
                      {available ? (
                        <button
                          type="button"
                          disabled={!ev.enabled}
                          onClick={() => saveSub(ev, { channels: { [ch]: !checked } })}
                          className={`
                            w-7 h-7 rounded-full flex items-center justify-center
                            transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/30
                            disabled:opacity-40 disabled:cursor-not-allowed
                            ${checked
                              ? "bg-green-500 text-white shadow-sm"
                              : "bg-background border-2 border-border hover:border-primary/50"
                            }
                          `}
                          aria-label={`${ev.name} — ${CHANNEL_META[ch].label}`}
                          aria-pressed={checked}
                        >
                          {checked && <Icon name="Check" size={14} className="text-white" />}
                        </button>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs h-7 flex items-center">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function EventsPanel({
  events,
  userRoles,
  onChange,
}: {
  events: CenterEvent[];
  userRoles: string[];
  onChange: (e: CenterEvent) => void;
}) {
  const hasMultipleRoles = userRoles.length > 1;
  const STORAGE_KEY = "notify_accordion_open_roles";
  const [openRoles, setOpenRoles] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return new Set(JSON.parse(saved) as string[]);
    } catch (e) { void e; }
    return new Set(userRoles);
  });

  const toggleRole = (role: string) => {
    setOpenRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch (e) { void e; }
      return next;
    });
  };

  // Для одной роли — просто таблица без аккордеона
  if (!hasMultipleRoles) {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-sm">О каких событиях уведомлять</p>
        <EventsTable events={events} onChange={onChange} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-semibold text-sm">О каких событиях уведомлять</p>
      <div className="space-y-2">
        {userRoles.map((role) => {
          const roleEvents = events.filter(
            (e) => !e.recipient_roles?.length || e.recipient_roles.includes(role)
          );
          const isOpen = openRoles.has(role);
          const enabledCount = roleEvents.filter((e) => e.enabled).length;

          const style = ROLE_STYLE[role] ?? ROLE_STYLE.master;

          return (
            <div key={role} className={`border rounded-2xl overflow-hidden ${style.border}`}>
              {/* Заголовок аккордеона */}
              <button
                type="button"
                onClick={() => toggleRole(role)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${style.bg} hover:brightness-95`}
              >
                <div className="flex items-center gap-2">
                  <Icon name={style.icon} size={15} className={style.accent} />
                  <span className="font-semibold text-sm">{ROLE_LABELS[role] ?? role}</span>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${style.badge}`}>
                    {enabledCount} из {roleEvents.length}
                  </span>
                </div>
                <Icon
                  name="ChevronDown"
                  size={16}
                  className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Тело аккордеона */}
              {isOpen && (
                <div className="border-t">
                  <EventsTable events={roleEvents} onChange={onChange} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Расписание: тихие часы ───────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function SchedulePanel({
  schedule,
  onChange,
}: {
  schedule: NotifyCenterState["schedule"];
  onChange: (s: NotifyCenterState["schedule"]) => void;
}) {
  const [saving, setSaving] = useState(false);

  const save = async (next: NotifyCenterState["schedule"]) => {
    onChange(next);
    setSaving(true);
    try {
      await notifyCenterApi.setSchedule(next);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="font-semibold text-sm">Тихие часы</p>
      <div className="bg-card border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon name="Moon" size={16} className="text-indigo-400" />
            <span className="text-sm">Не беспокоить ночью</span>
            {saving && <Icon name="Loader2" size={13} className="animate-spin text-muted-foreground" />}
          </div>
          <Switch
            checked={schedule.quiet_enabled}
            onCheckedChange={(v) => save({ ...schedule, quiet_enabled: v })}
          />
        </div>
        {schedule.quiet_enabled && (
          <div className="flex items-center gap-2 text-sm pl-6">
            <span className="text-muted-foreground">с</span>
            <HourSelect
              value={schedule.quiet_from}
              onChange={(h) => save({ ...schedule, quiet_from: h })}
            />
            <span className="text-muted-foreground">до</span>
            <HourSelect
              value={schedule.quiet_to}
              onChange={(h) => save({ ...schedule, quiet_to: h })}
            />
            <span className="text-xs text-muted-foreground ml-1">(МСК)</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          В тихие часы уведомления не отправляются. Срочные системные уведомления приходят всегда.
        </p>
      </div>
    </div>
  );
}

function HourSelect({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-muted/40 border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
    >
      {HOURS.map((h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, "0")}:00
        </option>
      ))}
    </select>
  );
}

// ─── Мастер подключения Email ─────────────────────────────────────────────────

function EmailWizard({
  currentEmail,
  onClose,
}: {
  currentEmail: string | null;
  onClose: () => void;
}) {
  const alreadyHas = !!currentEmail;

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Icon name="Wand2" size={15} className="text-blue-500" />
          Подключение Email
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <Icon name="X" size={18} />
        </button>
      </div>
      {alreadyHas ? (
        /* Уже есть email — показываем адрес и статус «Подключён» */
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
            <Icon name="CircleCheck" size={16} className="text-green-600 shrink-0" />
            <span className="text-sm font-medium text-green-800">{currentEmail}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Уведомления приходят на этот адрес. Изменить email можно в разделе{" "}
            <a href="/account" className="text-blue-600 hover:underline">Профиль</a>.
          </p>
          <Button
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            disabled
          >
            <Icon name="Check" size={14} />
            Подключён
          </Button>
        </div>
      ) : (
        /* Email не задан — ссылка в профиль */
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Добавьте email в профиле — и уведомления начнут приходить на почту.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => { window.location.href = "/account"; }}
          >
            <Icon name="UserRound" size={14} />
            Добавить в профиле
          </Button>
        </div>
      )}
    </div>
  );
}