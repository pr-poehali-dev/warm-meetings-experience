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

export default function LiveEventEditor({
  formData: fd,
  loading,
  onFormChange,
  onSubmit,
  onCancel,
}: Props) {
  const { toast } = useToast();
  const isEditing = Boolean(fd.id);

  const set = (patch: Partial<OrgEvent>) => onFormChange({ ...fd, ...patch });

  const handleSaveAsDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    set({ is_visible: false });
    setTimeout(() => onSubmit(e as unknown as React.FormEvent, false), 0);
  };

  const handlePublish = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!fd.title?.trim()) {
      toast({ title: "Укажите название события", variant: "destructive" });
      return;
    }
    if (!fd.event_date) {
      toast({ title: "Укажите дату события", variant: "destructive" });
      return;
    }
    set({ is_visible: true });
    setTimeout(() => onSubmit(e as unknown as React.FormEvent, false), 0);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e, false);
  };

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
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Icon name="MousePointer" size={13} />
          Кликайте на текст, чтобы редактировать
        </div>
      </div>

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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Icon
                    name="Loader2"
                    size={16}
                    className="animate-spin mr-2"
                  />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
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
                    <Icon
                      name="Loader2"
                      size={16}
                      className="animate-spin mr-2"
                    />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Icon name="FileEdit" size={16} className="mr-2" />
                    Черновик
                  </>
                )}
              </Button>
              <Button type="button" onClick={handlePublish} disabled={loading}>
                {loading ? (
                  <>
                    <Icon
                      name="Loader2"
                      size={16}
                      className="animate-spin mr-2"
                    />
                    Публикация...
                  </>
                ) : (
                  <>
                    <Icon name="Globe" size={16} className="mr-2" />
                    Опубликовать
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
