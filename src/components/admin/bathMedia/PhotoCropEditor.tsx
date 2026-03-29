import React, { useRef, useCallback, useEffect, useState } from "react";

const ASPECT_W = 16;
const ASPECT_H = 9;

interface CropState {
  x: number;
  y: number;
  size: number;
}

interface PhotoCropEditorProps {
  src: string;
  onApply: (croppedBase64: string) => void;
  onCancel: () => void;
}

export default function PhotoCropEditor({ src, onApply, onCancel }: PhotoCropEditorProps) {
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
    drawCrop();
  }, [crop, drawCrop]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setTimeout(drawCrop, 50);
    };
    img.src = src;
  }, [src, drawCrop]);

  const handleApply = () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

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

    const out = document.createElement("canvas");
    out.width = 1280;
    out.height = 720;
    out.getContext("2d")!.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, 1280, 720);

    onApply(out.toDataURL("image/jpeg", 0.9));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setCrop(c => ({
      ...c,
      x: dragStart.cx + (e.clientX - dragStart.x),
      y: dragStart.cy + (e.clientY - dragStart.y),
    }));
  };

  const handleMouseUp = () => setDragging(false);

  return (
    <div className="space-y-3 border-2 border-dashed border-blue-300 rounded-xl p-3 bg-blue-50/30">
      <p className="text-xs text-gray-500">Перетащите изображение, чтобы выбрать нужный фрагмент (16:9)</p>
      <div
        ref={containerRef}
        className="w-full cursor-move select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="w-full rounded-lg" style={{ display: "block" }} />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-gray-400">Масштаб</p>
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
          onClick={handleApply}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Применить
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
