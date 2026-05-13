import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import ExternalVideoBlock from "@/components/video/ExternalVideoBlock";
import func2url from "../../../backend/func2url.json";

const MEDIA_API = func2url["media-api"];

interface MediaItem {
  id: number;
  url: string;
  s3_key: string;
  media_type: "photo" | "video";
}

interface Props {
  eventId: number;
}

export default function EventMediaUpload({ eventId }: Props) {
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const token = localStorage.getItem("user_token") || "";

  const loadPhotos = async () => {
    try {
      const res = await fetch(`${MEDIA_API}/?event_media=1&event_id=${eventId}`);
      const data = await res.json();
      setPhotos((data.media || []).filter((m: MediaItem) => m.media_type === "photo"));
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { loadPhotos(); }, [eventId]);

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Файл слишком большой", description: "Максимум 10 МБ", variant: "destructive" });
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const res = await fetch(`${MEDIA_API}/?event_media=1`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Token": token },
          body: JSON.stringify({ file: base64, filename: file.name, event_id: eventId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
        toast({ title: "Фото загружено" });
        await loadPhotos();
      } catch (err: unknown) {
        toast({ title: "Ошибка", description: err instanceof Error ? err.message : "Не удалось загрузить", variant: "destructive" });
      } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (item: MediaItem) => {
    if (!confirm("Удалить фото?")) return;
    try {
      await fetch(`${MEDIA_API}/?event_media=1&media_id=${item.id}`, {
        method: "DELETE",
        headers: { "X-Session-Token": token },
      });
      setPhotos((prev) => prev.filter((i) => i.id !== item.id));
      toast({ title: "Фото удалено" });
    } catch {
      toast({ title: "Не удалось удалить", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {/* Фото */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Icon name="Image" size={14} className="text-muted-foreground" />
          <h4 className="text-sm font-medium">Фотографии</h4>
          <span className="text-xs text-muted-foreground">JPG, PNG, WebP · до 10 МБ</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => { Array.from(e.target.files || []).forEach(handleFile); e.target.value = ""; }}
        />

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Icon name="Loader2" size={14} className="animate-spin" />Загрузка...
          </div>
        ) : (
          <>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                {photos.map((item) => (
                  <div key={item.id} className="relative group rounded-lg overflow-hidden bg-muted aspect-square">
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Icon name="X" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-border rounded-xl p-3 text-center hover:border-primary/50 hover:bg-muted/40 transition-all disabled:opacity-50 group"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Icon name="Loader2" size={14} className="animate-spin" />Загрузка...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  <Icon name="ImagePlus" size={15} />
                  Добавить фото
                </div>
              )}
            </button>
          </>
        )}
      </div>

      {/* Видео — через существующий модуль внешних ссылок */}
      <ExternalVideoBlock
        ownerType="event"
        ownerId={eventId}
        userToken={token}
      />
    </div>
  );
}
