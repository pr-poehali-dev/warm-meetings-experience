import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import { NotifyLogEntry, CHANNEL_ICONS, NotifyChannel } from "@/lib/notify-api";

interface Props {
  log: NotifyLogEntry[];
  loading: boolean;
}

const STATUS_STYLES = {
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS = {
  sent: "Отправлено",
  failed: "Ошибка",
  pending: "В очереди",
};

function fmtDate(str: string | null) {
  if (!str) return "—";
  return new Date(str).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function NotifyHistory({ log, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">История отправок</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Все уведомления — последние 50 записей
        </p>
      </div>

      {log.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-2xl">
          <Icon name="History" size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Отправок ещё не было</p>
        </div>
      ) : (
        <div className="space-y-2">
          {log.map((entry) => (
            <div key={entry.id} className="rounded-xl border p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon name={CHANNEL_ICONS[entry.channel as NotifyChannel] as "Mail"} size={13} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {entry.recipient_name || entry.recipient_email || "—"}
                  </span>
                  {entry.recipient_email && entry.recipient_name && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:block">
                      {entry.recipient_email}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0 ${STATUS_STYLES[entry.status]}`}>
                  {STATUS_LABELS[entry.status]}
                </span>
              </div>

              {entry.subject && (
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-medium text-foreground">Тема:</span> {entry.subject}
                </p>
              )}

              <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                {entry.scenario_name && (
                  <span className="flex items-center gap-1">
                    <Icon name="Zap" size={9} />
                    {entry.scenario_name}
                  </span>
                )}
                {entry.event_title && (
                  <span className="flex items-center gap-1">
                    <Icon name="Calendar" size={9} />
                    {entry.event_title}
                  </span>
                )}
                <span className="flex items-center gap-1 ml-auto">
                  <Icon name="Clock" size={9} />
                  {fmtDate(entry.sent_at || entry.created_at)}
                </span>
              </div>

              {entry.status === "failed" && entry.error_text && (
                <div className="text-[11px] text-red-600 bg-red-50 rounded-lg px-2 py-1.5 flex gap-1.5">
                  <Icon name="AlertCircle" size={11} className="shrink-0 mt-0.5" />
                  {entry.error_text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
