export type MediaType = "photo" | "video_horizontal" | "video_vertical";

export interface MediaItem {
  key: string;
  url: string;
  type: MediaType;
  mime: string;
}

export interface BathMediaUploadProps {
  slug: string;
  photos: MediaItem[];
  videos: MediaItem[];
  onUpdate: () => void;
}

export interface MediaConfig {
  label: string;
  hint: string;
  ratio: string;
  icon: string;
  accept: string;
  maxMb: number;
  isVideo: boolean;
}

export const MEDIA_CONFIG: Record<MediaType, MediaConfig> = {
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
