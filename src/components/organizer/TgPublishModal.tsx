import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { tgPublishApi, TgChannel } from "@/lib/tg-publish-api";
import { OrgEvent } from "@/lib/organizer-api";
import { useAuth } from "@/contexts/AuthContext";

type PublishMode = "now" | "schedule";

interface Props {
  event: OrgEvent;
  onClose: () => void;
  onDone?: () => void;
}

export default function TgPublishModal({ event, onClose, onDone }: Props) {
  const { user } = useAuth();
  const [channels, setChannels] = useState<TgChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<PublishMode>("now");
  const [scheduleAt, setScheduleAt] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ published: number; errors: { channel: string; error: string }[] } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    tgPublishApi.getChannels(user.id)
      .then((ch) => {
        setChannels(ch);
        setSelectedIds(new Set(ch.map((c) => c.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const toggle = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const handlePublish = async () => {
    if (selectedIds.size === 0 || !user?.id) return;
    if (mode === "schedule" && !scheduleAt) {
      alert("Укажите дату и время публикации");
      return;
    }
    setPublishing(true);
    try {
      const res = await tgPublishApi.publishContent({
        contentType: "event",
        contentId: event.id,
        userId: user.id,
        channelIds: Array.from(selectedIds),
        publicationType: "manual",
        allowRepeat: true,
        scheduledAt: mode === "schedule" ? scheduleAt : undefined,
        publishedBy: user.id,
      });
      setResult({ published: res.published, errors: res.errors });
      onDone?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка публикации");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Icon name="Send" size={18} className="text-primary" />
              Публикация в каналы
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.title}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : result ? (
            <div className="space-y-4 text-center py-4">
              <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${result.published > 0 ? "bg-green-100" : "bg-amber-100"}`}>
                <Icon name={result.published > 0 ? "CheckCircle2" : "AlertCircle"} size={28} className={result.published > 0 ? "text-green-600" : "text-amber-600"} />
              </div>
              {mode === "schedule" ? (
                <div>
                  <p className="font-semibold">Публикация запланирована</p>
                  <p className="text-sm text-muted-foreground mt-1">Будет отправлена в выбранное время</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold">Опубликовано в {result.published} из {selectedIds.size} каналов</p>
                  {result.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-600 space-y-1">
                      {result.errors.map((e, i) => <p key={i}>{e.channel}: {e.error}</p>)}
                    </div>
                  )}
                </div>
              )}
              <Button onClick={onClose} size="sm">Закрыть</Button>
            </div>
          ) : (
            <>
              {/* Режим */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Тип публикации</p>
                <div className="flex gap-1 bg-muted/60 rounded-xl p-1">
                  {([["now", "Сейчас", "Zap"], ["schedule", "Отложить", "Clock"]] as const).map(([id, label, icon]) => (
                    <button
                      key={id}
                      onClick={() => setMode(id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${mode === id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Icon name={icon} size={13} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Дата/время для отложенной */}
              {mode === "schedule" && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Дата и время публикации</p>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}

              {/* Каналы */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Каналы</p>
                {channels.length === 0 ? (
                  <div className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-4 text-center">
                    <Icon name="Send" size={20} className="mx-auto mb-1.5 opacity-40" />
                    Нет подключённых каналов.<br />Добавьте канал в разделе Telegram.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {channels.map((ch) => {
                      const checked = selectedIds.has(ch.id);
                      return (
                        <button
                          key={ch.id}
                          onClick={() => toggle(ch.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-colors text-left ${checked ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/40"}`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                            {checked && <Icon name="Check" size={10} className="text-white" />}
                          </div>
                          <span className="flex-1 font-medium">{ch.chat_title}</span>
                          <span className="text-xs text-muted-foreground">{ch.chat_type}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!result && !loading && (
          <div className="p-5 border-t">
            <Button
              onClick={handlePublish}
              disabled={publishing || selectedIds.size === 0}
              className="w-full gap-2"
            >
              {publishing ? (
                <Icon name="Loader2" size={16} className="animate-spin" />
              ) : (
                <Icon name="Send" size={16} />
              )}
              {mode === "schedule" ? "Запланировать" : "Опубликовать"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
