import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import { MediaItem, MEDIA_CONFIG } from "./bathMediaTypes";
import func2url from "../../../../backend/func2url.json";

const MEDIA_API = func2url["upload-media"];

interface MediaCardProps {
  item: MediaItem;
  slug: string;
  onDeleted: () => void;
}

export default function MediaCard({ item, slug, onDeleted }: MediaCardProps) {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const isVideo = item.type !== "photo";
  const cfg = MEDIA_CONFIG[item.type];

  const handleDelete = async () => {
    if (!confirm("Удалить файл?")) return;
    setDeleting(true);
    try {
      await fetch(
        `${MEDIA_API}/?key=${encodeURIComponent(item.key)}&slug=${slug}&media_type=${item.type === "photo" ? "photo" : "video"}`,
        { method: "DELETE" }
      );
      toast({ title: "Удалено" });
      onDeleted();
    } catch {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative group rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
      {isVideo ? (
        <video
          src={item.url}
          className={`w-full object-cover ${cfg.ratio}`}
          controls={false}
          muted
          onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLVideoElement).pause();
            (e.currentTarget as HTMLVideoElement).currentTime = 0;
          }}
        />
      ) : (
        <img src={item.url} alt="" className={`w-full object-cover ${cfg.ratio}`} />
      )}

      <div className="absolute top-2 left-2">
        <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
          <Icon name={cfg.icon} size={11} />
          {item.type === "video_vertical" ? "9:16" : "16:9"}
        </span>
      </div>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg"
      >
        {deleting
          ? <Icon name="Loader2" size={14} className="animate-spin" />
          : <Icon name="Trash2" size={14} />
        }
      </button>
    </div>
  );
}