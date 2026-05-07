import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";

export interface VideoItem {
  id: number;
  provider: "vk_video" | "rutube" | "direct";
  embed_url: string;
  thumbnail_url?: string | null;
  title?: string | null;
  status?: string;
}

interface VideoPlayerProps {
  video: VideoItem;
  className?: string;
}

export function VideoPlayer({ video, className = "" }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isEmbed = video.provider === "vk_video" || video.provider === "rutube";

  const providerLabel =
    video.provider === "vk_video" ? "VK Video" :
    video.provider === "rutube" ? "RuTube" : null;

  if (isEmbed) {
    if (!playing) {
      return (
        <div
          className={`relative aspect-video bg-black rounded-2xl overflow-hidden cursor-pointer group ${className}`}
          onClick={() => setPlaying(true)}
        >
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt={video.title || ""} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <Icon name="Video" size={40} className="text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Icon name="Play" size={28} className="text-black ml-1" />
            </div>
            {video.title && (
              <span className="text-white text-sm font-medium text-center px-4 drop-shadow-md line-clamp-2">
                {video.title}
              </span>
            )}
          </div>
          {providerLabel && (
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/60 text-white text-xs font-medium">
              {providerLabel}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`relative aspect-video rounded-2xl overflow-hidden bg-black ${className}`}>
        <iframe
          src={video.embed_url}
          className="w-full h-full"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media"
          title={video.title || "Видео"}
        />
        <button
          onClick={() => setPlaying(false)}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          <Icon name="X" size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className={`relative aspect-video rounded-2xl overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        src={video.embed_url}
        controls
        preload="metadata"
        poster={video.thumbnail_url || undefined}
        className="w-full h-full"
        title={video.title || "Видео"}
      />
    </div>
  );
}

interface VideoGalleryProps {
  videos: VideoItem[];
  className?: string;
}

export function VideoGallery({ videos, className = "" }: VideoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (videos.length === 0) return null;

  const active = videos[activeIndex];

  return (
    <div className={className}>
      <VideoPlayer video={active} />

      {videos.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {videos.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setActiveIndex(i)}
              className={`flex-shrink-0 w-24 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                i === activeIndex
                  ? "border-primary"
                  : "border-transparent opacity-60 hover:opacity-80"
              }`}
            >
              {v.thumbnail_url ? (
                <img src={v.thumbnail_url} alt={v.title || ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  <Icon
                    name={v.provider === "vk_video" ? "Play" : v.provider === "rutube" ? "Play" : "Video"}
                    size={16}
                    className="text-white/50"
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
