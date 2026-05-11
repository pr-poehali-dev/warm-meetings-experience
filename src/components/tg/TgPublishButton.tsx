import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { tgPublishApi, TgChannel, ContentType, PublishResult } from "@/lib/tg-publish-api";

const TG_TEMPLATE_VARS = [
  { key: "{{event_title}}", label: "Название события" },
  { key: "{{event_date}}", label: "Дата события" },
  { key: "{{event_time}}", label: "Время события" },
  { key: "{{place}}", label: "Место проведения" },
  { key: "{{price}}", label: "Стоимость" },
  { key: "{{spots_left}}", label: "Осталось мест" },
  { key: "{{description_short}}", label: "Описание" },
  { key: "{{url}}", label: "Ссылка на событие" },
];

interface TgPublishButtonProps {
  contentType: ContentType;
  contentId: number;
  userId: number;
  label?: string;
  allowRepeat?: boolean;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  onSuccess?: (result: PublishResult) => void;
}

type Step = "preview" | "channels" | "done";

export default function TgPublishButton({
  contentType,
  contentId,
  userId,
  label = "Опубликовать в Telegram",
  allowRepeat = false,
  size = "sm",
  variant = "outline",
  className,
  onSuccess,
}: TgPublishButtonProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("preview");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVar = (v: string) => {
    const el = textareaRef.current;
    if (!el) { setEditedText((t) => t + v); return; }
    const start = el.selectionStart ?? editedText.length;
    const end = el.selectionEnd ?? editedText.length;
    const next = editedText.slice(0, start) + v + editedText.slice(end);
    setEditedText(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + v.length, start + v.length); }, 0);
  };

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState("");
  const [editedText, setEditedText] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [previewError, setPreviewError] = useState("");

  // Channels state
  const [channels, setChannels] = useState<TgChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [result, setResult] = useState<PublishResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("preview");
    setPreviewText("");
    setEditedText("");
    setHashtags("");
    setPreviewError("");
    setResult(null);
    setPublishError("");
    setScheduleMode(false);
    setScheduledAt("");

    setPreviewLoading(true);
    tgPublishApi
      .getPreview({ contentType, contentId, userId })
      .then((res) => {
        const text = res.text || "";
        setPreviewText(text);
        setEditedText(text);
        setPreviewPhoto(res.photo_url || "");
      })
      .catch(() => setPreviewError("Не удалось загрузить предпросмотр"))
      .finally(() => setPreviewLoading(false));
  }, [open]);

  const goToChannels = () => {
    setStep("channels");
    setChannelsLoading(true);
    setPublishError("");
    tgPublishApi
      .getChannels(userId)
      .then((chs) => {
        setChannels(chs);
        setSelected(chs.map((c) => c.id));
      })
      .catch(() => setPublishError("Не удалось загрузить каналы"))
      .finally(() => setChannelsLoading(false));
  };

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const finalText = [editedText.trim(), hashtags.trim()].filter(Boolean).join("\n\n");

  const handlePublish = async () => {
    if (selected.length === 0) {
      setPublishError("Выберите хотя бы один канал");
      return;
    }
    setPublishing(true);
    setPublishError("");
    try {
      let res: PublishResult;
      if (contentType === "article") {
        res = await tgPublishApi.publishArticle({
          articleId: contentId,
          channelIds: selected,
          allowRepeat,
          scheduledAt: scheduleMode && scheduledAt ? scheduledAt : undefined,
          customText: finalText || undefined,
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
          customText: finalText || undefined,
        });
      }
      setResult(res);
      setStep("done");
      if (res.ok && onSuccess) onSuccess(res);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Ошибка публикации");
    } finally {
      setPublishing(false);
    }
  };

  // Периодически отправляем просроченные отложенные публикации
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      tgPublishApi.flushScheduled(userId).catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, [open, userId]);

  const handleClose = () => setOpen(false);

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={() => setOpen(true)}
        title="Опубликовать в Telegram"
        className={label ? `gap-1.5 ${className ?? ""}` : `h-8 w-8 p-0 text-blue-500 ${className ?? ""}`}
      >
        <Icon name="Send" size={14} />
        {label || null}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />
          {/* Sheet */}
          <div
            className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl flex flex-col overflow-hidden"
            style={{
              maxHeight: "calc(100dvh - 48px)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Icon name="Send" size={16} className="text-primary" />
                    Публикация в каналы
                  </h2>
                  {step === "preview" && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Отредактируйте пост перед отправкой
                    </p>
                  )}
                  {step === "channels" && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Выберите каналы для публикации
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {step !== "preview" && step !== "done" && (
                    <button
                      onClick={() => setStep("preview")}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
                    >
                      <Icon name="ChevronLeft" size={13} />
                      Назад
                    </button>
                  )}
                  <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                    <Icon name="X" size={18} />
                  </button>
                </div>
              </div>
            </div>

          {/* STEP: PREVIEW */}
          {step === "preview" && (
            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              {previewLoading ? (
                <div className="flex justify-center py-8">
                  <Icon name="Loader2" size={22} className="animate-spin text-muted-foreground" />
                </div>
              ) : previewError ? (
                <div className="text-sm text-destructive text-center py-4">{previewError}</div>
              ) : (
                <>
                  {/* Telegram-like preview */}
                  <div className="bg-[#efede8] rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                        <Icon name="Send" size={13} className="text-primary-foreground" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">Предпросмотр поста</span>
                    </div>
                    {previewPhoto && (
                      <img
                        src={previewPhoto}
                        alt=""
                        className="w-full rounded-lg object-cover max-h-40"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                    <pre className="text-xs whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                      {finalText || previewText}
                    </pre>
                  </div>

                  {/* Text editor */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Текст поста
                    </label>
                    <textarea
                      ref={textareaRef}
                      className="w-full text-sm px-3 py-2.5 bg-muted/40 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[120px] font-mono"
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      placeholder="Текст поста..."
                      onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                    />
                    <div className="flex gap-1 flex-wrap">
                      {TG_TEMPLATE_VARS.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          title={v.label}
                          onClick={() => insertVar(v.key)}
                          className="px-2 py-0.5 bg-muted hover:bg-muted/70 rounded text-[11px] font-mono text-primary transition-colors"
                        >
                          {v.key}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Хештеги
                    </label>
                    <input
                      type="text"
                      className="w-full text-sm px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={hashtags}
                      onChange={(e) => setHashtags(e.target.value)}
                      placeholder="#баня #спа #оздоровление"
                    />
                  </div>

                  <Button className="w-full gap-2" onClick={goToChannels}>
                    Выбрать каналы
                    <Icon name="ChevronRight" size={15} />
                  </Button>
                </>
              )}
            </div>
          )}

          {/* STEP: CHANNELS */}
          {step === "channels" && (
            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              {channelsLoading ? (
                <div className="flex justify-center py-8">
                  <Icon name="Loader2" size={22} className="animate-spin text-muted-foreground" />
                </div>
              ) : channels.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6 space-y-1">
                  <Icon name="Send" size={28} className="mx-auto opacity-25 block" />
                  <p>Нет подключённых каналов.</p>
                  <p className="text-xs">Добавьте канал через Telegram-бот.</p>
                </div>
              ) : (
                <>
                  {/* TIP TYPE */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setScheduleMode(false)}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl border transition-colors ${
                        !scheduleMode
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Icon name="Zap" size={14} />
                      Сейчас
                    </button>
                    <button
                      onClick={() => setScheduleMode(true)}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl border transition-colors ${
                        scheduleMode
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Icon name="Clock" size={14} />
                      Отложить
                    </button>
                  </div>

                  {scheduleMode && (
                    <input
                      type="datetime-local"
                      className="w-full text-sm px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  )}

                  {/* Channels list */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Каналы
                    </label>
                    {channels.map((ch) => (
                      <label
                        key={ch.id}
                        className="flex items-center gap-2.5 cursor-pointer group p-2 rounded-xl hover:bg-muted/40 transition-colors"
                      >
                        <div
                          onClick={() => toggle(ch.id)}
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                            selected.includes(ch.id)
                              ? "bg-primary border-primary"
                              : "border-border"
                          }`}
                        >
                          {selected.includes(ch.id) && (
                            <Icon name="Check" size={11} className="text-primary-foreground" />
                          )}
                        </div>
                        <span className="text-sm truncate flex-1">
                          {ch.chat_title || `Канал #${ch.id}`}
                        </span>
                        <span className="text-xs text-muted-foreground/60 shrink-0">
                          {ch.channel_type || "channel"}
                        </span>
                      </label>
                    ))}
                  </div>

                  {publishError && (
                    <p className="text-xs text-destructive">{publishError}</p>
                  )}

                  <Button
                    className="w-full gap-2"
                    disabled={publishing || selected.length === 0 || (scheduleMode && !scheduledAt)}
                    onClick={handlePublish}
                  >
                    {publishing ? (
                      <Icon name="Loader2" size={14} className="animate-spin" />
                    ) : (
                      <Icon name="Send" size={14} />
                    )}
                    {scheduleMode && scheduledAt ? "Запланировать" : "Опубликовать"}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* STEP: DONE */}
          {step === "done" && result && (
            <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
              {result.published > 0 ? (
                <>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scheduleMode ? "bg-blue-100" : "bg-green-100"}`}>
                    <Icon name={scheduleMode ? "Clock" : "Check"} size={24} className={scheduleMode ? "text-blue-600" : "text-green-600"} />
                  </div>
                  <p className="font-semibold text-sm">
                    {scheduleMode
                      ? `Запланировано в ${result.published} ${result.published === 1 ? "канал" : result.published < 5 ? "канала" : "каналов"} на ${new Date(scheduledAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                      : `Опубликовано в ${result.published} ${result.published === 1 ? "канал" : result.published < 5 ? "канала" : "каналов"}`}
                  </p>
                  {result.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      Ошибки: {result.errors.map((e) => e.channel).join(", ")}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Icon name="Info" size={22} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {result.reason === "no_channels"
                      ? "Нет подключённых каналов"
                      : "Уже опубликовано ранее"}
                  </p>
                </>
              )}
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setStep("preview")}>
                  Опубликовать ещё раз
                </Button>
                <Button size="sm" onClick={handleClose}>
                  Закрыть
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </>
  );
}