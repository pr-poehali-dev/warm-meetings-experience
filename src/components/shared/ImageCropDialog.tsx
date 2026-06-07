import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import Icon from "@/components/ui/icon";

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string;
  aspect?: number;
  cropShape?: "round" | "rect";
  title?: string;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

async function getCroppedImg(imageSrc: string, crop: Area): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");

  const maxSize = 1000;
  const scale = Math.min(1, maxSize / Math.max(crop.width, crop.height));
  canvas.width = Math.round(crop.width * scale);
  canvas.height = Math.round(crop.height * scale);

  ctx.drawImage(
    image,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, canvas.width, canvas.height,
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("crop failed")); return; }
      resolve(new File([blob], "crop.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  });
}

export default function ImageCropDialog({
  open, imageSrc, aspect = 1, cropShape = "round",
  title = "Настройте фото", onCancel, onCropped,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!areaPixels) return;
    setProcessing(true);
    try {
      const file = await getCroppedImg(imageSrc, areaPixels);
      onCropped(file);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <Icon name="ZoomOut" size={16} className="text-muted-foreground flex-shrink-0" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.01}
            onValueChange={(v) => setZoom(v[0])}
          />
          <Icon name="ZoomIn" size={16} className="text-muted-foreground flex-shrink-0" />
        </div>
        <p className="text-xs text-muted-foreground text-center -mt-1">
          Перетащите фото и приблизьте, чтобы выбрать нужную часть
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={processing || !areaPixels}>
            {processing ? "Обработка..." : "Применить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
