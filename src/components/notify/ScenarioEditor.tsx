import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import {
  NotifyScenario, NotifyChannel,
  TRIGGER_LABELS, CHANNEL_LABELS, CHANNEL_ICONS, TEMPLATE_VARS,
  TriggerType,
} from "@/lib/notify-api";

interface Props {
  scenario: Partial<NotifyScenario> | null;
  onSave: (data: Partial<NotifyScenario>) => Promise<void>;
  onCancel: () => void;
}

const EMPTY: Partial<NotifyScenario> = {
  name: "",
  trigger_type: "manual",
  trigger_hours: null,
  trigger_status: null,
  channels: ["email"],
  subject: "",
  body_html: "",
  body_text: "",
  is_active: true,
};

const CHANNELS: NotifyChannel[] = ["email", "telegram", "vk"];
const TRIGGERS: TriggerType[] = ["manual", "before_event", "after_event", "on_signup", "on_status_change"];

export default function ScenarioEditor({ scenario, onSave, onCancel }: Props) {
  const [form, setForm] = useState<Partial<NotifyScenario>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"settings" | "template">("settings");

  useEffect(() => {
    setForm(scenario ? { ...EMPTY, ...scenario } : { ...EMPTY });
    setTab("settings");
  }, [scenario]);

  const set = (field: keyof NotifyScenario, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const toggleChannel = (ch: NotifyChannel) => {
    const cur = (form.channels as NotifyChannel[]) || [];
    if (cur.includes(ch)) {
      if (cur.length === 1) return; // минимум 1 канал
      set("channels", cur.filter((c) => c !== ch));
    } else {
      set("channels", [...cur, ch]);
    }
  };

  const insertVar = (varKey: string) => {
    set("body_html", (form.body_html || "") + varKey);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    if (!form.body_html?.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!scenario?.id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{isEdit ? "Редактирование сценария" : "Новый сценарий"}</p>
          <p className="text-xs text-muted-foreground">Настройте шаблон и триггер отправки</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 px-2">
          <Icon name="X" size={16} />
        </Button>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 text-xs">
        {(["settings", "template"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${tab === t ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
          >
            {t === "settings" ? "Настройки" : "Шаблон письма"}
          </button>
        ))}
      </div>

      {tab === "settings" && (
        <div className="space-y-4">
          {/* Название */}
          <div className="space-y-1.5">
            <Label className="text-xs">Название сценария</Label>
            <Input
              value={form.name || ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="напр. «Напоминание за день»"
              className="h-9 text-sm"
            />
          </div>

          {/* Триггер */}
          <div className="space-y-1.5">
            <Label className="text-xs">Когда отправлять</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {TRIGGERS.map((t) => (
                <button
                  key={t}
                  onClick={() => set("trigger_type", t)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${form.trigger_type === t ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${form.trigger_type === t ? "border-primary" : "border-muted-foreground/40"}`}>
                    {form.trigger_type === t && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium leading-tight">{TRIGGER_LABELS[t]}</div>
                    {(t === "before_event" || t === "after_event") && form.trigger_type === t && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <Input
                          type="number"
                          value={form.trigger_hours ?? ""}
                          onChange={(e) => set("trigger_hours", +e.target.value || null)}
                          placeholder="24"
                          className="w-20 h-7 text-xs"
                          min={1}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-xs text-muted-foreground">часов</span>
                      </div>
                    )}
                    {t === "on_status_change" && form.trigger_type === t && (
                      <div className="mt-1.5">
                        <Input
                          value={form.trigger_status || ""}
                          onChange={(e) => set("trigger_status", e.target.value)}
                          placeholder="confirmed / cancelled / attended"
                          className="h-7 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Каналы */}
          <div className="space-y-1.5">
            <Label className="text-xs">Каналы отправки</Label>
            <div className="flex gap-2 flex-wrap">
              {CHANNELS.map((ch) => {
                const active = (form.channels as NotifyChannel[] || []).includes(ch);
                return (
                  <button
                    key={ch}
                    onClick={() => toggleChannel(ch)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    <Icon name={CHANNEL_ICONS[ch] as "Mail"} size={13} />
                    {CHANNEL_LABELS[ch]}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Telegram и ВКонтакте работают только если участник привязал аккаунт
            </p>
          </div>

          {/* Активность */}
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="text-sm font-medium">Сценарий активен</p>
              <p className="text-xs text-muted-foreground">Неактивные сценарии не запускаются автоматически</p>
            </div>
            <button
              onClick={() => set("is_active", !form.is_active)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_active ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-4" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
      )}

      {tab === "template" && (
        <div className="space-y-4">
          {/* Тема */}
          <div className="space-y-1.5">
            <Label className="text-xs">Тема письма</Label>
            <Input
              value={form.subject || ""}
              onChange={(e) => set("subject", e.target.value)}
              placeholder="напр. «Встреча {{event_title}} — завтра»"
              className="h-9 text-sm"
            />
          </div>

          {/* Переменные */}
          <div className="space-y-1.5">
            <Label className="text-xs">Переменные для подстановки</Label>
            <div className="flex gap-1.5 flex-wrap">
              {TEMPLATE_VARS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => insertVar(v.key)}
                  title={v.label}
                  className="px-2 py-1 bg-muted hover:bg-muted/70 rounded-md text-xs font-mono text-primary transition-colors"
                >
                  {v.key}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Нажмите переменную — она добавится в конец текста</p>
          </div>

          {/* Текст письма */}
          <div className="space-y-1.5">
            <Label className="text-xs">Текст письма (HTML)</Label>
            <textarea
              value={form.body_html || ""}
              onChange={(e) => set("body_html", e.target.value)}
              placeholder={"<p>Здравствуйте, {{name}}!</p>\n<p>Напоминаем: встреча «{{event_title}}» состоится {{event_date}} в {{event_time}}.</p>\n<p>Будем рады видеть вас.</p>"}
              className="w-full min-h-[180px] rounded-xl border bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Превью */}
          {form.body_html && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Предпросмотр</Label>
              <div
                className="border rounded-xl p-4 text-sm bg-muted/20 max-h-48 overflow-auto"
                dangerouslySetInnerHTML={{ __html: form.body_html
                  .replace(/\{\{name\}\}/g, "Анна")
                  .replace(/\{\{event_title\}\}/g, "Мужской пар")
                  .replace(/\{\{event_date\}\}/g, "15 мая")
                  .replace(/\{\{event_time\}\}/g, "19:00")
                  .replace(/\{\{bath_name\}\}/g, "Баня у озера")
                  .replace(/\{\{price\}\}/g, "1800")
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t">
        <Button onClick={handleSave} disabled={saving || !form.name?.trim() || !form.body_html?.trim()} className="flex-1 gap-2">
          {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Check" size={15} />}
          {isEdit ? "Сохранить изменения" : "Создать сценарий"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>Отмена</Button>
      </div>
    </div>
  );
}
