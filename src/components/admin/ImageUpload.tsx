import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import PhotoBank, { useRecentPhotos } from "./PhotoBank";
import func2url from "../../../backend/func2url.json";
const UPLOAD_URL = func2url["upload-media"];

const ASPECT_W = 16;
const ASPECT_H = 9;

interface CropState {
  x: number;
  y: number;
  size: number;
}

interface ImageUploadProps {
  currentImageUrl: string;
  onImageUploaded: (url: string) => void;
}

const ImageUpload = ({
  currentImageUrl,
  onImageUploaded,
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const [cropMode, setCropMode] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [showPhotoBank, setShowPhotoBank] = useState(false);
  const { addRecent } = useRecentPhotos();
  const [crop, setCrop] = useState<CropState>({ x: 0, y: 0, size: 100 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cx: 0, cy: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const { toast } = useToast();

  const drawCrop = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const container = containerRef.current;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = Math.round((cw * ASPECT_H) / ASPECT_W);
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
    const cropH = Math.round((cropW * ASPECT_H) / ASPECT_W);
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
    const ch = Math.round((cw * ASPECT_H) / ASPECT_W);

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
    const cropH = Math.round((cropW * ASPECT_H) / ASPECT_W);
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
    setPreviewUrl(croppedDataUrl);
    setCropMode(false);
    uploadImage(croppedDataUrl, "cropped.jpg");
  };

  const uploadImage = async (base64Image: string, filename: string) => {
    setUploading(true);
    try {
      const response = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image, filename }),
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      onImageUploaded(data.url);

      toast({ title: "Готово!", description: "Изображение загружено" });
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить изображение",
        variant: "destructive",
      });
      setPreviewUrl(currentImageUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Ошибка",
        description: "Выберите изображение",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 10 МБ",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      openCrop(src);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setCrop((c) => ({ ...c, x: dragStart.cx + dx, y: dragStart.cy + dy }));
  };

  const handleMouseUp = () => setDragging(false);

  const handleRemove = () => {
    setPreviewUrl("");
    onImageUploaded("");
    toast({ title: "Удалено", description: "Изображение удалено" });
  };

  const handleBankSelect = (url: string) => {
    setPreviewUrl(url);
    addRecent(url);
    onImageUploaded(url);
    setShowPhotoBank(false);
    toast({ title: "Готово!", description: "Фото из банка выбрано" });
  };

  return (
    <div className="space-y-4">
      <Label>Изображение события</Label>

      {cropMode && originalImage ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Перетащите изображение, чтобы выбрать нужный фрагмент (16:9)
          </p>
          <div
            ref={containerRef}
            className="w-full cursor-move select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg"
              style={{ display: "block" }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Масштаб кадрирования
            </Label>
            <input
              type="range"
              min={30}
              max={100}
              value={crop.size}
              onChange={(e) =>
                setCrop((c) => ({ ...c, size: Number(e.target.value) }))
              }
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={applyCrop} disabled={uploading}>
              <Icon name="Check" size={16} className="mr-2" />
              {uploading ? "Загрузка..." : "Применить"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCropMode(false)}
            >
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Текущее фото */}
          {previewUrl && (
            <div className="relative w-full max-w-md">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full aspect-video object-cover rounded-lg border border-border"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <Icon name="Loader2" size={24} className="animate-spin text-white" />
                </div>
              )}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-2 flex-wrap">
            {/* Кнопка фотобанка */}
            <Button
              type="button"
              variant={showPhotoBank ? "default" : "outline"}
              onClick={() => setShowPhotoBank((v) => !v)}
              disabled={uploading}
            >
              <Icon name="Images" size={16} className="mr-2" />
              Фотобанк СПАРКОМ
            </Button>

            {/* Загрузить своё */}
            <div>
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById("image-upload")?.click()}
              >
                <Icon name="Upload" size={16} className="mr-2" />
                {uploading ? "Загрузка..." : "Своё фото"}
              </Button>
            </div>

            {previewUrl && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openCrop(previewUrl)}
                  disabled={uploading}
                >
                  <Icon name="Crop" size={16} className="mr-2" />
                  Обрезать
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  <Icon name="Trash2" size={16} className="mr-2" />
                  Удалить
                </Button>
              </>
            )}
          </div>

          {/* Панель фотобанка */}
          {showPhotoBank && (
            <div className="border border-border rounded-xl p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Icon name="Images" size={15} />
                  Фотобанк — выберите обложку
                </p>
                <button
                  type="button"
                  onClick={() => setShowPhotoBank(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name="X" size={16} />
                </button>
              </div>
              <PhotoBank
                currentUrl={previewUrl}
                onSelect={handleBankSelect}
                onClose={() => setShowPhotoBank(false)}
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Выберите фото из банка или загрузите своё · JPG, PNG до 10 МБ · будет обрезано до 16:9
          </p>
        </>
      )}
    </div>
  );
};

export default ImageUpload;