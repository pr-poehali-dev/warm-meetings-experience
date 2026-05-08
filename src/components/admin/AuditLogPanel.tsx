import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { auditLog, AuditEvent, AuditEntityType } from "@/lib/audit-log";
import { toast } from "sonner";

interface Props {
  entityType: AuditEntityType | string;
  entityId: string | number | null | undefined;
  /** Показывать поле для добавления заметки. По умолчанию — да. */
  allowComment?: boolean;
  /** Callback после успешной записи комментария — например, перезагрузить родителя. */
  onCommentAdded?: () => void;
}

const ACTION_META: Record<string, { label: string; icon: string; cls: string }> = {
  status_change: { label: "Сменил статус", icon: "Activity", cls: "text-blue-600 bg-blue-50" },
  priority_change: { label: "Сменил приоритет", icon: "Flag", cls: "text-amber-600 bg-amber-50" },
  block: { label: "Заблокировал", icon: "Ban", cls: "text-red-600 bg-red-50" },
  unblock: { label: "Разблокировал", icon: "CheckCircle", cls: "text-green-600 bg-green-50" },
  role_added: { label: "Добавил роль", icon: "Shield", cls: "text-violet-600 bg-violet-50" },
  role_removed: { label: "Убрал роль", icon: "Shield", cls: "text-slate-600 bg-slate-100" },
  comment: { label: "Заметка", icon: "MessageSquare", cls: "text-amber-700 bg-amber-50" },
  approve: { label: "Одобрил", icon: "Check", cls: "text-green-700 bg-green-50" },
  reject: { label: "Отклонил", icon: "X", cls: "text-red-700 bg-red-50" },
  verify: { label: "Подтвердил", icon: "BadgeCheck", cls: "text-green-700 bg-green-50" },
  delete: { label: "Удалил", icon: "Trash2", cls: "text-red-700 bg-red-50" },
  edit: { label: "Изменил", icon: "Pencil", cls: "text-blue-600 bg-blue-50" },
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AuditLogPanel({
  entityType,
  entityId,
  allowComment = true,
  onCommentAdded,
}: Props) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    if (!entityId) return;
    setLoading(true);
    const list = await auditLog.list(entityType, entityId, 50);
    setEvents(list);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const submitComment = async () => {
    if (!comment.trim() || !entityId) return;
    setSaving(true);
    await auditLog.record({
      entity_type: entityType,
      entity_id: entityId,
      action: "comment",
      comment: comment.trim(),
    });
    setComment("");
    setShowInput(false);
    setSaving(false);
    reload();
    onCommentAdded?.();
    toast.success("Заметка сохранена");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Icon name="History" size={14} />
          История изменений
        </div>
        {allowComment && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setShowInput((v) => !v)}
          >
            <Icon name={showInput ? "X" : "Plus"} size={12} className="mr-1" />
            {showInput ? "Отмена" : "Заметка"}
          </Button>
        )}
      </div>

      {showInput && (
        <div className="space-y-2 border border-border rounded-lg p-2 bg-muted/30">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Что важно зафиксировать?"
            rows={2}
            className="resize-none text-sm"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={submitComment} disabled={!comment.trim() || saving}>
              {saving && <Icon name="Loader2" size={12} className="animate-spin mr-1" />}
              Сохранить
            </Button>
          </div>
        </div>
      )}

      {loading && events.length === 0 ? (
        <div className="text-xs text-muted-foreground py-3 text-center">Загружаем…</div>
      ) : events.length === 0 ? (
        <div className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
          Изменений пока нет
        </div>
      ) : (
        <ul className="space-y-1.5">
          {events.map((ev) => {
            const meta = ACTION_META[ev.action] || {
              label: ev.action,
              icon: "Circle",
              cls: "text-gray-600 bg-gray-50",
            };
            return (
              <li
                key={ev.id}
                className="flex items-start gap-2 text-xs"
              >
                <span
                  className={`mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ${meta.cls}`}
                >
                  <Icon name={meta.icon} size={12} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">
                      {ev.actor_name || "Администратор"}
                    </span>
                    <span className="text-gray-500">{meta.label.toLowerCase()}</span>
                    {ev.field && ev.old_value !== null && ev.new_value !== null && (
                      <span className="text-gray-600">
                        <span className="line-through opacity-60">{ev.old_value}</span>
                        {" → "}
                        <span className="font-medium">{ev.new_value}</span>
                      </span>
                    )}
                    {ev.field &&
                      (ev.old_value === null || ev.new_value === null) && (
                        <span className="text-gray-600">
                          {ev.new_value || ev.old_value}
                        </span>
                      )}
                  </div>
                  {ev.comment && (
                    <div className="text-gray-700 bg-amber-50/60 border border-amber-100 rounded px-2 py-1 mt-1">
                      {ev.comment}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {fmt(ev.created_at)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
