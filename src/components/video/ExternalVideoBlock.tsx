import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { VideoItem } from "./VideoPlayer";
import func2url from "../../../backend/func2url.json";

const VIDEOS_API = func2url["media-api"];

interface ExternalVideoBlockProps {
  ownerType: "master" | "bath" | "event";
  ownerId: number;
  userToken: string;
}

const PROVIDER_HINTS = [
  { label: "VK Video", example: "https://vk.com/video-123456_789" },
  { label: "VK Клип", example: "https://vk.ru/clip-123456_789" },
  { label: "RuTube", example: "https://rutube.ru/video/abc123..." },
  { label: "Прямая .mp4", example: "https://example.com/video.mp4" },
];

function providerIcon(provider: string) {
  if (provider === "vk_video") return "🎬";
  if (provider === "rutube") return "📺";
  return "🎥";
}

function providerName(provider: string) {
  if (provider === "vk_video") return "VK Video";
  if (provider === "rutube") return "RuTube";
  return "Прямая ссылка";
}

function statusBadge(status: string) {
  if (status === "approved") return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Опубликовано</span>;
  if (status === "rejected") return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Отклонено</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">На модерации</span>;
}

export default function ExternalVideoBlock({ ownerType, ownerId, userToken }: ExternalVideoBlockProps) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const fetchVideos = async () => {
    try {
      const res = await fetch(`${VIDEOS_API}/?videos=1&owner_type=${ownerType}&owner_id=${ownerId}`);
      const data = await res.json();
      setVideos(data.videos || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVideos(); }, [ownerId, ownerType]);

  const handleAdd = async () => {
    if (!url.trim()) { setError("Введите ссылку на видео"); return; }
    setAdding(true); setError("");
    try {
      const res = await fetch(`${VIDEOS_API}/?videos=1&me=1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({ url: url.trim(), title: title.trim(), owner_type: ownerType, owner_id: ownerId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Ошибка при добавлении");
        return;
      }
      setUrl(""); setTitle(""); setShowForm(false);
      await fetchVideos();
    } catch {
      setError("Ошибка соединения");
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${VIDEOS_API}/?videos=1&me=1&video_id=${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${userToken}` },
      });
      setVideos((v) => v.filter((x) => x.id !== id));
    } catch { /* ignore */ }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const updated = [...videos];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setVideos(updated);
    await Promise.all([
      fetch(`${VIDEOS_API}/?videos=1&me=1&video_id=${updated[index - 1].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ sort_order: index - 1 }),
      }),
      fetch(`${VIDEOS_API}/?videos=1&me=1&video_id=${updated[index].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ sort_order: index }),
      }),
    ]);
  };

  const handleSaveTitle = async (id: number) => {
    await fetch(`${VIDEOS_API}/?videos=1&me=1&video_id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
      body: JSON.stringify({ title: editTitle }),
    });
    setVideos((v) => v.map((x) => x.id === id ? { ...x, title: editTitle } : x));
    setEditId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Видео</h3>
          <p className="text-xs text-muted-foreground">VK Video и Клипы, RuTube, прямые .mp4 ссылки</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => { setShowForm((v) => !v); setError(""); }}
        >
          <Icon name="Plus" size={13} />
          Добавить видео
        </Button>
      </div>

      {showForm && (
        <div className="border border-border rounded-2xl p-4 mb-4 bg-muted/30 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Ссылка на видео *</label>
            <input
              type="url"
              placeholder="https://vk.com/video-123456_789"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {PROVIDER_HINTS.map((h) => (
                <span key={h.label} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                  {h.label}: <span className="font-mono opacity-70">{h.example}</span>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Название (необязательно)</label>
            <input
              type="text"
              placeholder="Мастер-класс по парению"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={adding} className="gap-1.5">
              {adding ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Plus" size={13} />}
              {adding ? "Добавляю..." : "Добавить"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setError(""); }}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Icon name="Loader2" size={22} className="animate-spin text-muted-foreground" />
        </div>
      ) : videos.length === 0 ? (
        !showForm && (
          <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
            <Icon name="Video" size={28} className="mx-auto mb-2 opacity-40" />
            Добавьте видео из VK, RuTube или по прямой ссылке
          </div>
        )
      ) : (
        <div className="space-y-2">
          {videos.map((v, i) => (
            <div key={v.id} className="flex items-center gap-3 p-3 border border-border rounded-xl bg-background group">
              <div className="flex-shrink-0 text-xl">{providerIcon(v.provider)}</div>
              <div className="flex-1 min-w-0">
                {editId === v.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleSaveTitle(v.id)} className="h-7 text-xs px-2">Сохранить</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)} className="h-7 text-xs px-2">Отмена</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{v.title || providerName(v.provider)}</span>
                    {statusBadge(v.status || "pending")}
                  </div>
                )}
                <p className="text-xs text-muted-foreground truncate mt-0.5">{v.embed_url}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {i > 0 && (
                  <button
                    onClick={() => handleMoveUp(i)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    title="Переместить выше"
                  >
                    <Icon name="ArrowUp" size={13} className="text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => { setEditId(v.id); setEditTitle(v.title || ""); }}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  title="Редактировать"
                >
                  <Icon name="Pencil" size={13} className="text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  title="Удалить"
                >
                  <Icon name="Trash2" size={13} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}