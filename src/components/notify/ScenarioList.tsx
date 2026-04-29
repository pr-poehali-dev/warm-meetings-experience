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
}

export default function ScenarioList({ scenarios, loading, onEdit, onDelete, onSend, onNew }: Props) {
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
        <Button size="sm" onClick={onNew} className="gap-1.5">
          <Icon name="Plus" size={14} />
          Новый сценарий
        </Button>
      </div>

      {scenarios.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-2xl">
          <Icon name="Bell" size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Сценариев пока нет</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Создайте первый шаблон — например, напоминание за день до события
          </p>
          <Button size="sm" variant="outline" onClick={onNew} className="gap-1.5">
            <Icon name="Plus" size={14} />
            Создать сценарий
          </Button>
        </div>
      ) : (
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
