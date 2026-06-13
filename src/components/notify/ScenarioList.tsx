import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import { NotifyScenario, TRIGGER_LABELS, CHANNEL_LABELS, CHANNEL_ICONS, NotifyChannel } from "@/lib/notify-api";

interface Props {
  scenarios: NotifyScenario[];
  loading: boolean;
  onEdit: (s: NotifyScenario) => void;
  onDelete: (id: number) => void;
  onSend: (s: NotifyScenario) => void;
  onNew: () => void;
  onTemplate?: (tpl: Partial<NotifyScenario>) => void;
}

const SCENARIO_TEMPLATES: { icon: string; color: string; label: string; description: string; data: Partial<NotifyScenario> }[] = [
  {
    icon: "Bell",
    color: "text-blue-500",
    label: "Напоминание за день",
    description: "Отправляется за 24 ч до события",
    data: {
      name: "Напоминание за день до события",
      trigger_type: "before_event",
      trigger_hours: 24,
      channels: ["email"],
      subject: "Напоминание: {{event_title}} — завтра!",
      body_html: "<p>Привет, {{name}}!</p><p>Напоминаем, что завтра вас ждёт <strong>{{event_title}}</strong>.</p><p>📅 Дата: {{event_date}}<br>🕐 Время: {{event_time}}<br>📍 Место: {{bath_name}}</p><p>Ждём вас!</p>",
      body_text: "Привет, {{name}}!\n\nНапоминаем, что завтра вас ждёт {{event_title}}.\n\nДата: {{event_date}}\nВремя: {{event_time}}\nМесто: {{bath_name}}\n\nДо встречи!",
      is_active: true,
    },
  },
  {
    icon: "UserCheck",
    color: "text-emerald-500",
    label: "Подтверждение записи",
    description: "Автоматически при новом участнике",
    data: {
      name: "Подтверждение записи",
      trigger_type: "on_signup",
      trigger_hours: null,
      channels: ["email"],
      subject: "Вы записаны на {{event_title}}",
      body_html: "<p>Привет, {{name}}!</p><p>Ваша запись на <strong>{{event_title}}</strong> подтверждена.</p><p>📅 {{event_date}} в {{event_time}}<br>📍 {{bath_name}}</p><p>Стоимость: {{price}}</p><p>Будем рады видеть вас!</p>",
      body_text: "Привет, {{name}}!\n\nВаша запись на {{event_title}} подтверждена.\n\n{{event_date}} в {{event_time}}\n{{bath_name}}\n\nСтоимость: {{price}}\n\nДо встречи!",
      is_active: true,
    },
  },
  {
    icon: "Star",
    color: "text-amber-500",
    label: "Отзыв после события",
    description: "Через 2 часа после окончания",
    data: {
      name: "Просьба оставить отзыв",
      trigger_type: "after_event",
      trigger_hours: 2,
      channels: ["email"],
      subject: "Как прошло? Оставьте отзыв о {{event_title}}",
      body_html: "<p>Привет, {{name}}!</p><p>Надеемся, что <strong>{{event_title}}</strong> прошло замечательно.</p><p>Будем очень рады, если вы поделитесь впечатлениями — это помогает нам становиться лучше.</p><p>Спасибо, что были с нами!</p>",
      body_text: "Привет, {{name}}!\n\nНадеемся, что {{event_title}} прошло замечательно.\n\nБудем очень рады, если вы поделитесь впечатлениями.\n\nСпасибо, что были с нами!",
      is_active: true,
    },
  },
  {
    icon: "Send",
    color: "text-violet-500",
    label: "Ручная рассылка",
    description: "Отправляется вручную по кнопке",
    data: {
      name: "Новость для участников",
      trigger_type: "manual",
      trigger_hours: null,
      channels: ["email"],
      subject: "Важная новость: {{event_title}}",
      body_html: "<p>Привет, {{name}}!</p><p>Хотим поделиться важной информацией о <strong>{{event_title}}</strong>.</p><p>[Напишите текст сообщения здесь]</p>",
      body_text: "Привет, {{name}}!\n\nХотим поделиться важной информацией о {{event_title}}.\n\n[Напишите текст сообщения здесь]",
      is_active: true,
    },
  },
];

export default function ScenarioList({ scenarios, loading, onEdit, onDelete, onSend, onNew, onTemplate }: Props) {
  const [showTemplates, setShowTemplates] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Сценарии уведомлений</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Шаблоны писем и сообщений с настраиваемыми триггерами
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setShowTemplates((v) => !v)} className="gap-1.5">
            <Icon name="LayoutTemplate" size={14} />
            Из шаблона
          </Button>
          <Button size="sm" onClick={onNew} className="gap-1.5">
            <Icon name="Plus" size={14} />
            Новый
          </Button>
        </div>
      </div>

      {showTemplates && (
        <div className="rounded-2xl border bg-muted/30 p-3 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Выберите шаблон:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SCENARIO_TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                onClick={() => { onTemplate?.(tpl.data); setShowTemplates(false); }}
                className="flex items-start gap-3 p-3 rounded-xl border bg-card text-left hover:border-primary/40 hover:bg-primary/[0.03] transition-all group"
              >
                <div className={`mt-0.5 shrink-0 ${tpl.color}`}>
                  <Icon name={tpl.icon as "Bell"} size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">{tpl.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {scenarios.length === 0 && !showTemplates && (
        <div className="text-center py-10 border-2 border-dashed rounded-2xl">
          <Icon name="Bell" size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Сценариев пока нет</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Нажмите «Из шаблона» чтобы выбрать готовый или создайте свой
          </p>
        </div>
      )}

      {scenarios.length > 0 && (
        <div className="space-y-2">
          {scenarios.map((sc) => (
            <div key={sc.id} className={`rounded-xl border p-4 transition-all ${sc.is_active ? "bg-card" : "bg-muted/30 opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{sc.name}</span>
                    {!sc.is_active && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">неактивен</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Icon name="Zap" size={11} />
                      {TRIGGER_LABELS[sc.trigger_type]}
                      {sc.trigger_hours != null && ` (${sc.trigger_hours} ч)`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {(sc.channels as NotifyChannel[]).map((ch) => (
                      <Badge key={ch} variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                        <Icon name={CHANNEL_ICONS[ch] as "Mail"} size={10} />
                        {CHANNEL_LABELS[ch]}
                      </Badge>
                    ))}
                  </div>

                  {sc.subject && (
                    <p className="text-xs text-muted-foreground mt-1.5 truncate">
                      Тема: {sc.subject}
                    </p>
                  )}
                </div>

                <div className="flex gap-1 shrink-0">
                  {sc.trigger_type === "manual" && sc.is_active && (
                    <Button size="sm" variant="outline" onClick={() => onSend(sc)} className="gap-1 h-8 text-xs">
                      <Icon name="Send" size={12} />
                      Отправить
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onEdit(sc)} className="h-8 px-2">
                    <Icon name="Pencil" size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(sc.id)}
                    className="h-8 px-2 text-muted-foreground hover:text-destructive">
                    <Icon name="Trash2" size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}