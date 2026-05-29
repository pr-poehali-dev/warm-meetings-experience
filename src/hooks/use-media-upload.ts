import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import func2url from "../../backend/func2url.json";

const MEDIA_API = func2url["media-api"];

export interface MediaUploadResult {
  url?: string;
  [key: string]: unknown;
}

export interface UseMediaUploadOptions {
  /** Полный URL эндпоинта. По умолчанию — media-api. */
  endpoint?: string;
  /** Максимальный размер файла в МБ. По умолчанию 10. */
  maxMb?: number;
  /** Доп. заголовки (например, X-Session-Token для авторизованных загрузок). */
  headers?: Record<string, string>;
  /**
   * Строит тело запроса из base64 и файла. Разные эндпоинты ждут разные поля
   * (image/file, folder/slug/event_id и т.д.) — поэтому контракт задаётся здесь.
   */
  buildBody: (base64: string, file: File) => Record<string, unknown>;
  /** Сообщение об успехе в toast. null — не показывать. */
  successMessage?: string | null;
  /** Колбэк после успешной загрузки. */
  onUploaded?: (result: MediaUploadResult, file: File) => void;
}

/**
 * Единый хук загрузки медиа: лимит размера → FileReader→base64 → fetch → toast.
 * UI (drag-n-drop, кроп, превью) остаётся в компонентах — они слишком разные.
 */
export function useMediaUpload(options: UseMediaUploadOptions) {
  const {
    endpoint = `${MEDIA_API}/`,
    maxMb = 10,
    headers,
    buildBody,
    successMessage = "Загружено!",
    onUploaded,
  } = options;

  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const checkSize = useCallback(
    (file: File): boolean => {
      if (file.size > maxMb * 1024 * 1024) {
        toast({
          title: "Файл слишком большой",
          description: `Максимум ${maxMb} МБ`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    },
    [maxMb, toast]
  );

  /** Загрузить уже готовый base64 (например, после кропа). */
  const uploadBase64 = useCallback(
    async (base64: string, file: File): Promise<MediaUploadResult | null> => {
      setUploading(true);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(headers || {}) },
          body: JSON.stringify(buildBody(base64, file)),
        });
        const text = await res.text();
        let data: MediaUploadResult = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          /* not json */
        }
        if (!res.ok) {
          throw new Error((data.error as string) || `Ошибка сервера (${res.status})`);
        }
        if (successMessage) {
          toast({ title: successMessage });
        }
        onUploaded?.(data, file);
        return data;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Не удалось загрузить файл";
        toast({ title: "Ошибка", description: msg, variant: "destructive" });
        return null;
      } finally {
        setUploading(false);
      }
    },
    [endpoint, headers, buildBody, successMessage, onUploaded, toast]
  );

  /** Прочитать файл и загрузить (с проверкой размера). */
  const uploadFile = useCallback(
    async (file: File): Promise<MediaUploadResult | null> => {
      if (!checkSize(file)) return null;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          resolve(await uploadBase64(base64, file));
        };
        reader.onerror = () => {
          toast({ title: "Ошибка", description: "Не удалось прочитать файл", variant: "destructive" });
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    },
    [checkSize, uploadBase64, toast]
  );

  return { uploading, uploadFile, uploadBase64, checkSize };
}
