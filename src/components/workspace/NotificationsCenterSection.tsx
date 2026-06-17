import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

interface Props {
  masterId: number;
  userRole: "organizer" | "master" | "partner";
  tgLinked: boolean;
  tgChannelsCount: number;
  refreshTgInfo: () => void;
}

export default function NotificationsCenterSection({
  masterId,
  userRole,
  tgLinked,
  tgChannelsCount,
  refreshTgInfo,
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
            <li>Напишите сообществу одно сообщение — это разрешит нам писать вам в личку.</li>
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
          onDone={(email) => {
            setState((p) =>
              p
                ? {
                    ...p,
                    channels: {
                      ...p.channels,
                      email: { ...p.channels.email, connected: true, active: true, value: email },
                    },
                  }
                : p
            );
            setWizard(null);
          }}
        />
      )}

      {/* ── Нижняя панель: события × каналы ── */}
      <EventsPanel
        events={state.events}
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
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">Каналы получения</p>
        <Button size="sm" variant="outline" onClick={() => onOpenWizard("telegram")} className="gap-1.5">
          <Icon name="Plus" size={14} />
          Настроить каналы
        </Button>
      </div>
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

function EventsPanel({
  events,
  onChange,
}: {
  events: CenterEvent[];
  onChange: (e: CenterEvent) => void;
}) {
  // группировка по категориям
  const groups: Record<string, CenterEvent[]> = {};
  events.forEach((e) => {
    (groups[e.category] = groups[e.category] || []).push(e);
  });

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

  const allChannels: CenterChannel[] = ["telegram", "email", "vk"];

  return (
    <div className="space-y-2">
      <p className="font-semibold text-sm">О каких событиях уведомлять</p>
      <div className="bg-card border rounded-2xl overflow-hidden">
        {/* шапка */}
        <div className="hidden sm:grid grid-cols-[1fr_auto] gap-2 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
          <div>Событие</div>
          <div className="flex gap-4">
            {allChannels.map((ch) => (
              <span key={ch} className="w-16 text-center">
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
                <div className="flex gap-4 pl-11 sm:pl-0">
                  {allChannels.map((ch) => {
                    const available = ev.available_channels.includes(ch);
                    const checked = available && ev.enabled && ev.channels[ch] !== false;
                    return (
                      <div key={ch} className="w-16 flex justify-center">
                        {available ? (
                          <Switch
                            checked={checked}
                            disabled={!ev.enabled}
                            onCheckedChange={(v) => saveSub(ev, { channels: { [ch]: v } })}
                          />
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
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
  onDone,
}: {
  currentEmail: string | null;
  onClose: () => void;
  onDone: (email: string) => void;
}) {
  const [email, setEmail] = useState(currentEmail || "");
  const [saving, setSaving] = useState(false);
  const alreadyHas = !!currentEmail;

  const save = async () => {
    const v = email.trim();
    if (!alreadyHas && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      toast.error("Укажите корректный email");
      return;
    }
    setSaving(true);
    try {
      const res = await notifyCenterApi.setEmail(v);
      toast.success("Email подключён");
      onDone(res.email || v);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

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
        <p className="text-xs text-muted-foreground">
          Уведомления будут приходить на <b>{currentEmail}</b> — адрес вашего аккаунта.
          Нажмите «Включить», чтобы активировать канал.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Укажите email — на него будут приходить подтверждения, напоминания и важные уведомления.
          </p>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
          />
        </>
      )}
      <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
        {saving && <Icon name="Loader2" size={13} className="animate-spin" />}
        {alreadyHas ? "Включить" : "Подключить"}
      </Button>
    </div>
  );
}