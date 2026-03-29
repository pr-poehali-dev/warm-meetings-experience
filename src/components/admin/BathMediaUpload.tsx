import Icon from "@/components/ui/icon";
import { MediaType, MediaItem, BathMediaUploadProps, MEDIA_CONFIG } from "./bathMedia/bathMediaTypes";
import MediaCard from "./bathMedia/MediaCard";
import UploadZone from "./bathMedia/UploadZone";

export type { MediaType, MediaItem };

function Section({ type, items, slug, onUpdate }: {
  type: MediaType;
  items: MediaItem[];
  slug: string;
  onUpdate: () => void;
}) {
  const cfg = MEDIA_CONFIG[type];
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon name={cfg.icon} size={16} className="text-gray-500" />
        <h4 className="text-sm font-semibold text-gray-700">{cfg.label}</h4>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cfg.hint}</span>
        <span className="ml-auto text-xs text-gray-400">{items.length} шт.</span>
      </div>
      <div className={`grid gap-3 mb-3 ${type === "video_vertical" ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
        {items.map((item) => (
          <MediaCard key={item.key} item={item} slug={slug} onDeleted={onUpdate} />
        ))}
      </div>
      <UploadZone type={type} slug={slug} onUploaded={onUpdate} />
    </div>
  );
}

export default function BathMediaUpload({ slug, photos, videos, onUpdate }: BathMediaUploadProps) {
  const allPhotos = photos.filter((m) => m.type === "photo" || !m.type);
  const horizVideos = videos.filter((m) => m.type === "video_horizontal");
  const vertVideos = videos.filter((m) => m.type === "video_vertical");

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <div className="font-medium mb-1">Требования к медиафайлам:</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mt-1">
          <div>📷 Фото: JPG/PNG/WebP, 16:9, до 10 МБ</div>
          <div>🎬 Видео гор.: MP4/MOV, 1920×1080, до 100 МБ</div>
          <div>📱 Видео верт.: MP4/MOV, 1080×1920, до 50 МБ</div>
        </div>
      </div>

      <Section type="photo" items={allPhotos} slug={slug} onUpdate={onUpdate} />
      <Section type="video_horizontal" items={horizVideos} slug={slug} onUpdate={onUpdate} />
      <Section type="video_vertical" items={vertVideos} slug={slug} onUpdate={onUpdate} />
    </div>
  );
}
