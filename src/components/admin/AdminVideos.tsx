import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { VideoPlayer, VideoItem } from "@/components/video/VideoPlayer";
import func2url from "../../../backend/func2url.json";

const VIDEOS_API = func2url["videos-api"];

function getAdminToken() {
  return localStorage.getItem("admin_token") || "";
}

function statusBadge(status: string) {
  if (status === "approved") return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Опубликовано</span>;
  if (status === "rejected") return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Отклонено</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">На модерации</span>;
}

function ownerLabel(v: VideoItem & { owner_type?: string; owner_id?: number }) {
  if (v.owner_type === "master") return `Мастер #${v.owner_id}`;
  if (v.owner_type === "bath") return `Баня #${v.owner_id}`;
  if (v.owner_type === "event") return `Событие #${v.owner_id}`;
  return `#${v.owner_id}`;
}

function providerLabel(p: string) {
  if (p === "vk_video") return "VK Video";
  if (p === "rutube") return "RuTube";
  return "Прямая ссылка";
}

interface AdminVideoItem extends VideoItem {
  owner_type?: string;
  owner_id?: number;
  created_at?: string;
}

export default function AdminVideos() {
  const [videos, setVideos] = useState<AdminVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [previewVideo, setPreviewVideo] = useState<AdminVideoItem | null>(null);
  const [moderating, setModerating] = useState<number | null>(null);

  const load = async (s: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${VIDEOS_API}/?admin=1&status=${s}`, {
        headers: { "X-Admin-Token": getAdminToken() },
      });
      const data = await res.json();
      setVideos(data.videos || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const moderate = async (id: number, newStatus: "approved" | "rejected") => {
    setModerating(id);
    try {
      await fetch(`${VIDEOS_API}/?admin_moderate=1`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken() },
        body: JSON.stringify({ id, status: newStatus }),
      });
      setVideos((v) => v.filter((x) => x.id !== id));
    } catch { /* ignore */ }
    finally { setModerating(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Модерация видео</h2>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s === "pending" ? "На модерации" : s === "approved" ? "Одобрено" : "Отклонено"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="Video" size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Нет видео в этом разделе</p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((v) => (
            <div key={v.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4 items-start">
              <button
                onClick={() => setPreviewVideo(previewVideo?.id === v.id ? null : v)}
                className="flex-shrink-0 w-28 h-16 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Icon name="Play" size={20} className="text-gray-400" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap mb-1">
                  <span className="text-sm font-medium">{v.title || providerLabel(v.provider)}</span>
                  {statusBadge(v.status || "pending")}
                  <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-lg">{ownerLabel(v)}</span>
                  <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-lg">{providerLabel(v.provider)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-1">{v.embed_url}</p>
                {v.created_at && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {previewVideo?.id === v.id && (
                  <div className="mt-3">
                    <VideoPlayer video={v} />
                  </div>
                )}
              </div>
              {v.status === "pending" && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
                    onClick={() => moderate(v.id, "approved")}
                    disabled={moderating === v.id}
                  >
                    {moderating === v.id ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Check" size={12} />}
                    Одобрить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => moderate(v.id, "rejected")}
                    disabled={moderating === v.id}
                  >
                    <Icon name="X" size={12} />
                    Отклонить
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
