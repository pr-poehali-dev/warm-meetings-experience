import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import func2url from "../../../backend/func2url.json";

const MEDIA_API = func2url["media-api"];

interface MediaItem {
  id: number;
  url: string;
  s3_key: string;
  media_type: "photo" | "video";
  mime_type: string;
}

interface Props {
  eventId: number;
}

export default function EventMediaUpload({ eventId }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const token = localStorage.getItem("user_token") || "";
  const headers = { "Content-Type": "application/json", "X-Session-Token": token };

  const load = async () => {
    try {
      const res = await fetch(`${MEDIA_API}/?event_media=1&event_id=${eventId}`);
      const data = await res.json();
      setItems(data.media || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eventId]);

  const handleFile = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const maxMb = isVideo ? 100 : 10;
    if (file.size > maxMb * 1024 * 1024) {
      toast({ title: "Файл слишком большой", description: `Максимум ${maxMb} МБ`, variant: "destructive" });
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const res = await fetch(`${MEDIA_API}/?event_media=1`, {
          method: "POST",
          headers,
          body: JSON.stringify({ file: base64, filename: file.name, event_id: eventId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
        toast({ title: isVideo ? "Видео загружено" : "Фото загружено" });
        await load();
      } catch (err: unknown) {
        toast({ title: "Ошибка", description: err instanceof Error ? err.message : "Не удалось загрузить", variant: "destructive" });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (item: MediaItem) => {
    if (!confirm("Удалить файл?")) return;
    try {
      const res = await fetch(`${MEDIA_API}/?event_media=1&media_id=${item.id}`, {
        method: "DELETE",
        headers: { "X-Session-Token": token },
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast({ title: "Файл удалён" });
    } catch {
      toast({ title: "Не удалось удалить", variant: "destructive" });
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        multiple
        className="hidden"
        onChange={(e) => {
          Array.from(e.target.files || []).forEach(handleFile);
          e.target.value = "";
        }}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Icon name="Loader2" size={14} className="animate-spin" />
          Загрузка...
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
              {items.map((item) => (
                <div key={item.id} className="relative group rounded-lg overflow-hidden bg-muted aspect-square">
                  {item.media_type === "video" ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <Icon name="Play" size={24} className="text-white/70" />
                      <video src={item.url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                    </div>
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <Icon name="X" size={12} />
                  </button>
                  {item.media_type === "video" && (
                    <div className="absolute bottom-1 left-1">
                      <span className="text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">видео</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 hover:bg-muted/40 transition-all disabled:opacity-50 group"
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Icon name="Loader2" size={16} className="animate-spin" />
                Загрузка...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                <Icon name="ImagePlus" size={16} />
                <span>Добавить фото или видео</span>
                <span className="text-xs opacity-60">до 10 МБ / 100 МБ</span>
              </div>
            )}
          </button>
        </>
      )}
    </div>
  );
}
