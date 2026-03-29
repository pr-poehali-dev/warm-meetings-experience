import { useState, useRef, useCallback, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import func2url from "../../../backend/func2url.json";

const MEDIA_API = func2url["bath-media"];

const ASPECT_W = 16;
const ASPECT_H = 9;

export type MediaType = "photo" | "video_horizontal" | "video_vertical";

export interface MediaItem {
  key: string;
  url: string;
  type: MediaType;
  mime: string;
}

interface BathMediaUploadProps {
  slug: string;
  photos: MediaItem[];
  videos: MediaItem[];
  onUpdate: () => void;
}

const MEDIA_CONFIG: Record<MediaType, {
  label: string;
  hint: string;
  ratio: string;
  icon: string;
  accept: string;
  maxMb: number;
  isVideo: boolean;
}> = {
  photo: {
    label: "Фотографии",
    hint: "16:9 • JPG, PNG, WebP • до 10 МБ",
    ratio: "aspect-video",
    icon: "Image",
    accept: "image/jpeg,image/png,image/webp",
    maxMb: 10,
    isVideo: false,
  },
  video_horizontal: {
    label: "Видео горизонтальное",
    hint: "16:9 (1920×1080) • MP4, MOV • до 100 МБ",
    ratio: "aspect-video",
    icon: "Video",
    accept: "video/mp4,video/quicktime,video/webm",
    maxMb: 100,
    isVideo: true,
  },
  video_vertical: {
    label: "Видео вертикальное",
    hint: "9:16 (1080×1920) • MP4, MOV • до 50 МБ",
    ratio: "aspect-[9/16]",
    icon: "Smartphone",
    accept: "video/mp4,video/quicktime,video/webm",
    maxMb: 50,
    isVideo: true,
  },
};

interface CropState {
  x: number;
  y: number;
  size: number;
}

function UploadZone({ type, slug, onUploaded, disabled }: {
  type: MediaType;
  slug: string;
  onUploaded: () => void;
  disabled?: boolean;
}) {
  const cfg = MEDIA_CONFIG[type];
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Crop state — only used when type === "photo"
  const [cropMode, setCropMode] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropState>({ x: 0, y: 0, size: 100 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cx: 0, cy: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const drawCrop = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const container = containerRef.current;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = Math.round(cw * ASPECT_H / ASPECT_W);
    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext("2d")!;

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = cw / ch;

    let drawW: number, drawH: number, drawX: number, drawY: number;
    if (imgAspect > canvasAspect) {
      drawH = ch;
      drawW = ch * imgAspect;
      drawX = (cw - drawW) / 2;
      drawY = 0;
    } else {
      drawW = cw;
      drawH = cw / imgAspect;
      drawX = 0;
      drawY = (ch - drawH) / 2;
    }

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, drawX + crop.x, drawY + crop.y, drawW, drawH);

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, cw, ch);

    const cropW = cw * (crop.size / 100);
    const cropH = Math.round(cropW * ASPECT_H / ASPECT_W);
    const cx = (cw - cropW) / 2;
    const cy = (ch - cropH) / 2;

    ctx.clearRect(cx, cy, cropW, cropH);
    ctx.drawImage(img, drawX + crop.x, drawY + crop.y, drawW, drawH);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cropW, cropH);

    const third_w = cropW / 3;
    const third_h = cropH / 3;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + third_w * i, cy);
      ctx.lineTo(cx + third_w * i, cy + cropH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + third_h * i);
      ctx.lineTo(cx + cropW, cy + third_h * i);
      ctx.stroke();
    }
  }, [crop]);

  useEffect(() => {
    if (cropMode) drawCrop();
  }, [crop, cropMode, drawCrop]);

  const openCrop = (src: string) => {
    setOriginalImage(src);
    setCrop({ x: 0, y: 0, size: 100 });
    setCropMode(true);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setTimeout(drawCrop, 50);
    };
    img.src = src;
  };

  const applyCrop = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const container = containerRef.current;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = Math.round(cw * ASPECT_H / ASPECT_W);

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = cw / ch;

    let drawW: number, drawH: number, drawX: number, drawY: number;
    if (imgAspect > canvasAspect) {
      drawH = ch;
      drawW = ch * imgAspect;
      drawX = (cw - drawW) / 2;
      drawY = 0;
    } else {
      drawW = cw;
      drawH = cw / imgAspect;
      drawX = 0;
      drawY = (ch - drawH) / 2;
    }

    const cropW = cw * (crop.size / 100);
    const cropH = Math.round(cropW * ASPECT_H / ASPECT_W);
    const cx = (cw - cropW) / 2;
    const cy = (ch - cropH) / 2;

    const scaleX = img.naturalWidth / drawW;
    const scaleY = img.naturalHeight / drawH;

    const srcX = (cx - drawX - crop.x) * scaleX;
    const srcY = (cy - drawY - crop.y) * scaleY;
    const srcW = cropW * scaleX;
    const srcH = cropH * scaleY;

    const outputW = 1280;
    const outputH = 720;
    const out = document.createElement("canvas");
    out.width = outputW;
    out.height = outputH;
    const octx = out.getContext("2d")!;
    octx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputW, outputH);

    const croppedDataUrl = out.toDataURL("image/jpeg", 0.9);
    setCropMode(false);
    uploadBase64(croppedDataUrl, "image/jpeg");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setCrop(c => ({ ...c, x: dragStart.cx + dx, y: dragStart.cy + dy }));
  };

  const handleMouseUp = () => setDragging(false);

  const uploadBase64 = async (base64: string, mimeType: string) => {
    setUploading(true);
    setProgress(40);
    try {
      const res = await fetch(`${MEDIA_API}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, file_type: mimeType, slug, media_type: type }),
      });
      setProgress(90);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка загрузки");
      }
      toast({ title: "Загружено!", description: `${cfg.label} добавлено` });
      onUploaded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Не удалось загрузить файл";
      toast({ title: "Ошибка", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFile = async (file: File) => {
    if (file.size > cfg.maxMb * 1024 * 1024) {
      toast({ title: "Файл слишком большой", description: `Максимум ${cfg.maxMb} МБ`, variant: "destructive" });
      return;
    }

    if (type === "photo") {
      // For photos: read the file and open crop UI
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        openCrop(src);
      };
      reader.readAsDataURL(file);
    } else {
      // For videos: upload directly as before
      setUploading(true);
      setProgress(10);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setProgress(40);
        try {
          const res = await fetch(`${MEDIA_API}/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file: base64, file_type: file.type, slug, media_type: type }),
          });
          setProgress(90);
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Ошибка загрузки");
          }
          toast({ title: "Загружено!", description: `${cfg.label} добавлено` });
          onUploaded();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Не удалось загрузить файл";
          toast({ title: "Ошибка", description: msg, variant: "destructive" });
        } finally {
          setUploading(false);
          setProgress(0);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Crop UI — shown inline inside the zone when cropping a photo
  if (type === "photo" && cropMode && originalImage) {
    return (
      <div className="border-2 border-dashed border-blue-300 rounded-xl p-3 space-y-3 bg-blue-50/30">
        <p className="text-xs text-gray-500">Перетащите изображение, чтобы выбрать нужный фрагмент (16:9)</p>
        <div
          ref={containerRef}
          className="w-full cursor-move select-none rounded-lg overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas ref={canvasRef} className="w-full rounded-lg" style={{ display: "block" }} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-400">Масштаб кадрирования</p>
          <input
            type="range"
            min={30}
            max={100}
            value={crop.size}
            onChange={e => setCrop(c => ({ ...c, size: Number(e.target.value) }))}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={applyCrop}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Icon name="Check" size={14} />
            {uploading ? "Загрузка..." : "Применить"}
          </button>
          <button
            type="button"
            onClick={() => { setCropMode(false); setOriginalImage(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={cfg.accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        disabled={uploading || disabled}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        disabled={uploading || disabled}
        className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50 group"
      >
        {uploading ? (
          <div className="space-y-2">
            <Icon name="Loader2" size={24} className="animate-spin text-blue-500 mx-auto" />
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-500">Загрузка...</p>
          </div>
        ) : (
          <>
            <Icon name={cfg.icon} size={22} className="text-gray-400 group-hover:text-gray-600 mx-auto mb-1.5 transition-colors" />
            <p className="text-sm font-medium text-gray-700">Добавить {cfg.label.toLowerCase()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{cfg.hint}</p>
          </>
        )}
      </button>
    </div>
  );
}

function MediaCard({ item, slug, onDeleted }: {
  item: MediaItem;
  slug: string;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const isVideo = item.type !== "photo";
  const cfg = MEDIA_CONFIG[item.type];

  const handleDelete = async () => {
    if (!confirm("Удалить файл?")) return;
    setDeleting(true);
    try {
      await fetch(`${MEDIA_API}/?key=${encodeURIComponent(item.key)}&slug=${slug}&media_type=${item.type === "photo" ? "photo" : "video"}`, {
        method: "DELETE",
      });
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
          onMouseLeave={(e) => { (e.currentTarget as HTMLVideoElement).pause(); (e.currentTarget as HTMLVideoElement).currentTime = 0; }}
        />
      ) : (
        <img src={item.url} alt="" className={`w-full object-cover ${cfg.ratio}`} />
      )}

      {/* Type badge */}
      <div className="absolute top-2 left-2">
        <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
          <Icon name={cfg.icon} size={11} />
          {item.type === "video_vertical" ? "9:16" : "16:9"}
        </span>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg"
      >
        {deleting ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Trash2" size={14} />}
      </button>
    </div>
  );
}

export default function BathMediaUpload({ slug, photos, videos, onUpdate }: BathMediaUploadProps) {
  const allPhotos = photos.filter((m) => m.type === "photo" || !m.type);
  const horizVideos = videos.filter((m) => m.type === "video_horizontal");
  const vertVideos = videos.filter((m) => m.type === "video_vertical");

  const Section = ({ type, items }: { type: MediaType; items: MediaItem[] }) => {
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
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <div className="font-medium mb-1">Требования к медиафайлам:</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mt-2">
          <div className="bg-white rounded-lg p-2.5 border border-blue-100">
            <Icon name="Image" size={14} className="mb-1 text-blue-500" />
            <div className="font-medium">Фото</div>
            <div className="text-gray-500">Соотношение 16:9<br/>JPG, PNG, WebP<br/>до 10 МБ</div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-blue-100">
            <Icon name="Video" size={14} className="mb-1 text-blue-500" />
            <div className="font-medium">Видео горизонт.</div>
            <div className="text-gray-500">16:9 (1920×1080)<br/>MP4, MOV<br/>до 100 МБ</div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-blue-100">
            <Icon name="Smartphone" size={14} className="mb-1 text-blue-500" />
            <div className="font-medium">Видео вертикал.</div>
            <div className="text-gray-500">9:16 (1080×1920)<br/>MP4, MOV<br/>до 50 МБ</div>
          </div>
        </div>
      </div>

      <Section type="photo" items={allPhotos} />
      <div className="border-t border-gray-100 pt-6">
        <Section type="video_horizontal" items={horizVideos} />
      </div>
      <div className="border-t border-gray-100 pt-6">
        <Section type="video_vertical" items={vertVideos} />
      </div>
    </div>
  );
}
