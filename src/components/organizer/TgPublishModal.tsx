import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { tgPublishApi, TgChannel, TgPublication, OrgEvent } from "@/lib/organizer-api";
import { useAuth } from "@/contexts/AuthContext";

type PublishMode = "now" | "schedule" | "reminder";

interface Props {
  event: OrgEvent;
  onClose: () => void;
  onDone?: () => void;
}

const DEFAULT_TEMPLATE = (ev: OrgEvent, mode: PublishMode) => {
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const d = new Date(ev.event_date);
  const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  const timeStr = ev.start_time ? (ev.end_time ? `${ev.start_time.slice(0,5)} — ${ev.end_time.slice(0,5)}` : ev.start_time.slice(0,5)) : '';
  const price = ev.price_label || (ev.price_amount ? `${ev.price_amount} ₽` : 'Бесплатно');
  const url = `https://sparcom.ru/events/${ev.slug || ev.id}`;
  const reminder = mode === "reminder" ? "🔔 *Напоминание! Завтра событие:*\n\n" : "";
  return `${reminder}📅 *${ev.title}*

🗓 ${dateStr}${timeStr ? ', ' + timeStr : ''}
📍 ${ev.bath_name || ''}
💰 ${price}
👥 Осталось мест: ${ev.spots_left ?? ev.total_spots ?? '—'}

${(ev.short_description || ev.description || '').slice(0, 300)}

👉 [Подробнее и запись](${url})`.trim();
};

export default function TgPublishModal({ event, onClose, onDone }: Props) {
  const { user } = useAuth();
  const [channels, setChannels] = useState<TgChannel[]>([]);
  const [publications, setPublications] = useState<TgPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<PublishMode>("now");
  const [customText, setCustomText] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ published: number; errors: { channel: string; error: string }[] } | null>(null);

  useEffect(() => {
    Promise.all([
      tgPublishApi.getChannels(),
      tgPublishApi.getPublications(event.id),
    ]).then(([ch, pub]) => {
      setChannels(ch.channels);
      setPublications(pub.publications);
      // Выбрать все каналы по умолчанию
      setSelectedIds(new Set(ch.channels.map(c => c.id)));
      setCustomText(DEFAULT_TEMPLATE(event, "now"));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [event]);

  useEffect(() => {
    setCustomText(DEFAULT_TEMPLATE(event, mode));
  }, [mode, event]);

  const toggle = (id: number) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    return next;
  });

  const handlePublish = async () => {
    if (selectedIds.size === 0) return;
    setPublishing(true);
    try {
      const channel_ids = Array.from(selectedIds);
      const organizer_id = event.organizer_id || user?.id || 0;
      const published_by = user?.id;

      if (mode === "schedule") {
        if (!scheduleAt) { alert("Укажите дату и время публикации"); setPublishing(false); return; }
        await tgPublishApi.schedulePublish({
          event_id: event.id,
          organizer_id,
          channel_ids,
          scheduled_at: scheduleAt,
          custom_text: customText || undefined,
          published_by,
        });
        setResult({ published: channel_ids.length, errors: [] });
      } else if (mode === "reminder") {
        const res = await tgPublishApi.sendReminder({
          event_id: event.id,
          organizer_id,
          channel_ids,
          custom_text: customText || undefined,
          published_by,
        });
        setResult(res);
      } else {
        const res = await tgPublishApi.publishManual({
          event_id: event.id,
          organizer_id,
          channel_ids,
          custom_text: customText || undefined,
          published_by,
        });
        setResult(res);
      }
      onDone?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка публикации");
    } finally {
      setPublishing(false);
    }
  };

  const sentToIds = new Set(publications.filter(p => p.status === 'sent').map(p => p.channel_id));

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
            /* Результат */
            <div className="space-y-4 text-center py-4">
              <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${result.published > 0 ? 'bg-green-100' : 'bg-amber-100'}`}>
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
                  {([["now", "Сейчас", "Zap"], ["schedule", "Отложить", "Clock"], ["reminder", "Напоминание", "Bell"]] as const).map(([id, label, icon]) => (
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
                {mode === "reminder" && (
                  <p className="text-xs text-muted-foreground mt-2 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                    Напоминание — отдельный пост со специальным заголовком. Отправляется вручную (например, за день до события).
                  </p>
                )}
              </div>

              {/* Дата/время для отложенной */}
              {mode === "schedule" && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Дата и время публикации</p>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={e => setScheduleAt(e.target.value)}
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
                    {channels.map(ch => {
                      const alreadySent = sentToIds.has(ch.id);
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
                          <div className="flex-1 min-w-0">
                            <span className="font-medium truncate block">{ch.chat_title || ch.chat_id}</span>
                            {alreadySent && <span className="text-[10px] text-green-600">уже публиковалось</span>}
                          </div>
                          <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">{ch.channel_type}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Редактор текста */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Текст публикации</p>
                  <button
                    onClick={() => setCustomText(DEFAULT_TEMPLATE(event, mode))}
                    className="text-xs text-primary hover:underline"
                  >
                    Сбросить
                  </button>
                </div>
                <textarea
                  rows={10}
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono text-xs leading-relaxed"
                  placeholder="Текст поста в Telegram..."
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Поддерживается Markdown: *жирный*, _курсив_, [ссылка](url)
                </p>
              </div>

              {/* История */}
              {publications.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">История публикаций</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {publications.map(p => (
                      <div key={p.id} className="flex items-center gap-2 text-xs py-1.5 px-3 bg-muted/40 rounded-lg">
                        <Icon
                          name={p.status === 'sent' ? "CheckCircle2" : p.status === 'scheduled' ? "Clock" : "XCircle"}
                          size={12}
                          className={p.status === 'sent' ? "text-green-600" : p.status === 'scheduled' ? "text-blue-600" : "text-red-500"}
                        />
                        <span className="flex-1 truncate">{p.chat_title}</span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {p.status === 'scheduled' ? `запл. ${new Date(p.scheduled_at!).toLocaleString('ru')}` : new Date(p.published_at).toLocaleString('ru')}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.publication_type === 'reminder' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.publication_type === 'reminder' ? 'напомн.' : p.publication_type === 'manual' ? 'ручная' : 'первая'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && !loading && (
          <div className="border-t p-4 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Выбрано каналов: {selectedIds.size}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={publishing || selectedIds.size === 0 || channels.length === 0}
                className="gap-1.5"
              >
                {publishing ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Send" size={14} />}
                {mode === "schedule" ? "Запланировать" : mode === "reminder" ? "Отправить напоминание" : "Опубликовать"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}