import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { MediaType, MEDIA_CONFIG } from "./bathMediaTypes";
import PhotoCropEditor from "./PhotoCropEditor";

interface UploadZoneProps {
  type: MediaType;
  slug: string;
  onUploaded: () => void;
  disabled?: boolean;
}

export default function UploadZone({ type, slug, onUploaded, disabled }: UploadZoneProps) {
  const cfg = MEDIA_CONFIG[type];
  const [progress, setProgress] = useState(0);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { uploading, uploadBase64: doUpload } = useMediaUpload({
    maxMb: cfg.maxMb,
    buildBody: (base64, file) => ({ file: base64, file_type: file.type, slug, media_type: type }),
    successMessage: null,
    onUploaded: () => {
      setProgress(90);
      toast({ title: "Загружено!", description: `${cfg.label} добавлено` });
      onUploaded();
      setProgress(0);
    },
  });

  // Обёртка для совместимости: принимает base64 + mimeType, как раньше.
  // mime передаём через File-заглушку — buildBody читает file.type.
  const uploadBase64 = (base64: string, mime: string) => {
    setProgress(40);
    return doUpload(base64, new File([], "media", { type: mime }));
  };

  const handleFile = (file: File) => {
    if (file.size > cfg.maxMb * 1024 * 1024) {
      toast({ title: "Файл слишком большой", description: `Максимум ${cfg.maxMb} МБ`, variant: "destructive" });
      return;
    }

    if (type === "photo") {
      const reader = new FileReader();
      reader.onload = (e) => setCropSrc(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setProgress(10);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await uploadBase64(base64, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  if (type === "photo" && cropSrc) {
    return (
      <PhotoCropEditor
        src={cropSrc}
        onApply={(croppedBase64) => {
          setCropSrc(null);
          uploadBase64(croppedBase64, "image/jpeg");
        }}
        onCancel={() => setCropSrc(null)}
      />
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