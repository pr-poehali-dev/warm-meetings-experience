import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { tgPublishApi, TgChannel, ContentType, PublishResult } from "@/lib/tg-publish-api";

interface TgPublishButtonProps {
  contentType: ContentType;
  contentId: number;
  userId: number;
  label?: string;
  allowRepeat?: boolean;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  onSuccess?: (result: PublishResult) => void;
}

export default function TgPublishButton({
  contentType,
  contentId,
  userId,
  label = "Опубликовать в Telegram",
  allowRepeat = false,
  size = "sm",
  variant = "outline",
  onSuccess,
}: TgPublishButtonProps) {
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<TgChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [result, setResult] = useState<PublishResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setResult(null);
    setError("");
    tgPublishApi.getChannels(userId).then((chs) => {
      setChannels(chs);
      setSelected(chs.map((c) => c.id));
    }).catch(() => setError("Не удалось загрузить каналы")).finally(() => setLoading(false));
  }, [open, userId]);

  const toggle = (id: number) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handlePublish = async () => {
    if (selected.length === 0) { setError("Выберите хотя бы один канал"); return; }
    setPublishing(true); setError("");
    try {
      let res: PublishResult;
      if (contentType === "article") {
        res = await tgPublishApi.publishArticle({
          articleId: contentId,
          channelIds: selected,
          allowRepeat,
          scheduledAt: scheduleMode && scheduledAt ? scheduledAt : undefined,
        });
      } else {
        res = await tgPublishApi.publishContent({
          contentType,
          contentId,
          userId,
          channelIds: selected,
          publicationType: "manual",
          allowRepeat,
          scheduledAt: scheduleMode && scheduledAt ? scheduledAt : undefined,
          publishedBy: userId,
        });
      }
      setResult(res);
      if (res.ok && onSuccess) onSuccess(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка публикации");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="relative inline-block">
      <Button
        size={size}
        variant={variant}
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5"
      >
        <Icon name="Send" size={14} />
        {label}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-card border border-border rounded-2xl shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Публикация в Telegram</h4>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" size={15} />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : result ? (
              <div className={`rounded-xl p-3 text-sm ${result.published > 0 ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"}`}>
                {result.published > 0
                  ? `Опубликовано в ${result.published} канал${result.published === 1 ? "" : result.published < 5 ? "а" : "ов"}`
                  : result.reason === "no_channels"
                  ? "Нет подключённых каналов"
                  : "Уже опубликовано ранее"}
                {result.errors.length > 0 && (
                  <div className="mt-1 text-xs text-destructive">
                    Ошибки: {result.errors.map((e) => e.channel).join(", ")}
                  </div>
                )}
                <button onClick={() => setResult(null)} className="mt-2 text-xs underline block">
                  Опубликовать ещё раз
                </button>
              </div>
            ) : channels.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-3">
                <Icon name="Send" size={24} className="mx-auto mb-1 opacity-30" />
                Нет подключённых каналов.
                <br />Добавьте канал через Telegram-бот.
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  {channels.map((ch) => (
                    <label key={ch.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <div
                        onClick={() => toggle(ch.id)}
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${selected.includes(ch.id) ? "bg-primary border-primary" : "border-border"}`}
                      >
                        {selected.includes(ch.id) && <Icon name="Check" size={11} className="text-primary-foreground" />}
                      </div>
                      <span className="text-sm truncate flex-1">{ch.chat_title || `Канал #${ch.id}`}</span>
                      <Icon name="ExternalLink" size={12} className="text-muted-foreground/40" />
                    </label>
                  ))}
                </div>

                <div>
                  <button
                    onClick={() => setScheduleMode((v) => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <Icon name="Clock" size={12} />
                    {scheduleMode ? "Отменить отложенную" : "Запланировать публикацию"}
                  </button>
                  {scheduleMode && (
                    <input
                      type="datetime-local"
                      className="mt-2 w-full text-xs px-2 py-1.5 bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  )}
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  disabled={publishing || selected.length === 0}
                  onClick={handlePublish}
                >
                  {publishing ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Send" size={13} />}
                  {scheduleMode && scheduledAt ? "Запланировать" : "Опубликовать"}
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
