import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  supportApi,
  AttachmentInfo,
  SUPPORT_ALLOWED_MIME,
  SUPPORT_MAX_FILE_BYTES,
} from "@/lib/support-api";
import { toast } from "sonner";

type Props = {
  attachment: AttachmentInfo | null;
  onChange: (a: AttachmentInfo | null) => void;
  compact?: boolean;
};

export default function AttachmentPicker({ attachment, onChange, compact }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => fileRef.current?.click();

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!SUPPORT_ALLOWED_MIME.includes(f.type) && f.type !== "") {
      toast.error("Поддерживаются картинки, PDF и txt");
      return;
    }
    if (f.size > SUPPORT_MAX_FILE_BYTES) {
      toast.error("Файл больше 10 МБ");
      return;
    }
    setUploading(true);
    try {
      const info = await supportApi.uploadAttachment(f);
      onChange(info);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось загрузить");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf,text/plain"
        onChange={handle}
      />
      {attachment ? (
        <div
          className={`flex items-center gap-2 rounded-lg border border-border bg-muted/40 ${
            compact ? "px-2 py-1" : "px-2.5 py-2"
          } text-xs`}
        >
          <Icon name="Paperclip" size={13} className="text-muted-foreground flex-shrink-0" />
          <span className="truncate flex-1">{attachment.filename}</span>
          <span className="text-muted-foreground">
            {(attachment.size / 1024).toFixed(0)} КБ
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-foreground p-0.5"
            aria-label="Убрать"
          >
            <Icon name="X" size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ${
            compact ? "px-1.5 py-1" : "px-2 py-1.5 border border-dashed border-border rounded-lg"
          }`}
        >
          {uploading ? (
            <>
              <Icon name="Loader2" size={13} className="animate-spin" />
              Загрузка…
            </>
          ) : (
            <>
              <Icon name="Paperclip" size={13} />
              Прикрепить файл
            </>
          )}
        </button>
      )}
    </>
  );
}
