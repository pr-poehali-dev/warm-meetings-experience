import { OrgEvent } from "@/lib/organizer-api";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import LiveEditorHero from "./LiveEditorHero";
import LiveEditorCardBody from "./LiveEditorCardBody";

interface Props {
  formData: OrgEvent;
  loading: boolean;
  onFormChange: (data: OrgEvent) => void;
  onSubmit: (e: React.FormEvent, saveAndNew?: boolean) => void;
  onCancel: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: "Черновик", color: "text-gray-500", icon: "FileEdit" },
  pending: { label: "На модерации", color: "text-amber-600", icon: "Clock" },
  published: { label: "Опубликовано", color: "text-green-600", icon: "CheckCircle" },
  rejected: { label: "Отклонено", color: "text-red-600", icon: "XCircle" },
};

export default function LiveEventEditor({
  formData: fd,
  loading,
  onFormChange,
  onSubmit,
  onCancel,
}: Props) {
  const { toast } = useToast();
  const isEditing = Boolean(fd.id);
  const currentStatus = fd.status || "draft";
  const statusInfo = STATUS_LABELS[currentStatus] || STATUS_LABELS.draft;

  const set = (patch: Partial<OrgEvent>) => onFormChange({ ...fd, ...patch });

  const handleSaveAsDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    set({ is_visible: false, submit_action: "draft" } as OrgEvent & { submit_action: string });
    setTimeout(() => onSubmit(e as unknown as React.FormEvent, false), 0);
  };

  const handleSubmitForReview = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!fd.title?.trim()) {
      toast({ title: "Укажите название события", variant: "destructive" });
      return;
    }
    if (!fd.event_date) {
      toast({ title: "Укажите дату события", variant: "destructive" });
      return;
    }
    set({ is_visible: false, submit_action: "submit" } as OrgEvent & { submit_action: string });
    setTimeout(() => onSubmit(e as unknown as React.FormEvent, false), 0);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e, false);
  };

  const isPending = currentStatus === "pending";
  const isPublished = currentStatus === "published";

  return (
    <form onSubmit={handleSave} className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="ArrowLeft" size={20} />
        </button>
        <h1 className="text-xl font-bold">
          {isEditing ? "Редактировать встречу" : "Новая встреча"}
        </h1>
        {isEditing && (
          <span className={`ml-2 flex items-center gap-1 text-xs font-medium ${statusInfo.color}`}>
            <Icon name={statusInfo.icon} size={13} />
            {statusInfo.label}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Icon name="MousePointer" size={13} />
          Кликайте на текст, чтобы редактировать
        </div>
      </div>

      {/* Rejection notice */}
      {currentStatus === "rejected" && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <Icon name="XCircle" size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Событие отклонено администратором</div>
            {fd.rejection_reason && <div className="mt-0.5">{fd.rejection_reason}</div>}
            <div className="mt-1 text-xs text-red-500">Вы можете внести правки и отправить на модерацию повторно.</div>
          </div>
        </div>
      )}

      {/* Pending notice */}
      {isPending && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-start gap-2">
          <Icon name="Clock" size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Событие ожидает проверки администратором</div>
            <div className="mt-0.5 text-xs text-amber-600">После одобрения событие будет опубликовано автоматически.</div>
          </div>
        </div>
      )}

      {/* Hero: image + type selector */}
      <LiveEditorHero fd={fd} set={set} />

      {/* Card body: all fields */}
      <LiveEditorCardBody fd={fd} set={set} />

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Отмена
          </Button>
          {isEditing ? (
            <>
              <Button type="submit" variant="outline" disabled={loading}>
                {loading ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить черновик"
                )}
              </Button>
              {!isPending && !isPublished && (
                <Button type="button" onClick={handleSubmitForReview} disabled={loading}>
                  {loading ? (
                    <>
                      <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Icon name="Send" size={16} className="mr-2" />
                      Отправить на модерацию
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAsDraft}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Icon name="FileEdit" size={16} className="mr-2" />
                    Черновик
                  </>
                )}
              </Button>
              <Button type="button" onClick={handleSubmitForReview} disabled={loading}>
                {loading ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Icon name="Send" size={16} className="mr-2" />
                    Отправить на модерацию
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
