import { useState, useEffect, useCallback } from "react";
import { organizerApi, OrgEvent } from "@/lib/organizer-api";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

type EventWithMeta = OrgEvent & { organizer_name?: string; organizer_email?: string };

function EventDetailModal({ ev, onClose }: { ev: EventWithMeta; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b">
          <div className="min-w-0">
            <h3 className="font-bold text-base leading-tight break-words">{ev.title}</h3>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {ev.is_private ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Приватное</span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Публичное</span>
              )}
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">На модерации</span>
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100">
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Image */}
        {ev.image_url && (
          <img src={ev.image_url} alt={ev.title} className="w-full max-h-56 object-cover" />
        )}

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Основная инфо */}
          <Section title="Основная информация">
            <Row icon="Calendar" label="Дата" value={ev.event_date} />
            <Row icon="Clock" label="Время" value={[ev.start_time, ev.end_time].filter(Boolean).join(" – ")} />
            <Row icon="MapPin" label="Место" value={ev.bath_name} />
            <Row icon="Navigation" label="Адрес" value={ev.bath_address} />
            <Row icon="Tag" label="Тип события" value={ev.event_type} />
            <Row icon="Hash" label="Slug" value={ev.slug} />
            <Row icon="Code" label="Короткий код" value={ev.short_code} />
          </Section>

          {/* Организатор */}
          {(ev.organizer_name || ev.organizer_email) && (
            <Section title="Организатор">
              <Row icon="User" label="Имя" value={ev.organizer_name} />
              <Row icon="Mail" label="Email" value={ev.organizer_email} />
            </Section>
          )}

          {/* Цена и места */}
          <Section title="Цена и участники">
            <Row icon="Banknote" label="Цена" value={ev.price_label || (ev.price_amount ? `${ev.price_amount} ₽` : undefined)} />
            <Row icon="Users" label="Всего мест" value={ev.total_spots?.toString()} />
            <Row icon="UserCheck" label="Осталось мест" value={ev.spots_left?.toString()} />
            <Row icon="BarChart2" label="Тип цены" value={ev.pricing_type} />
          </Section>

          {/* Описание */}
          {ev.short_description && (
            <Section title="Краткое описание">
              <p className="text-sm text-gray-700 leading-relaxed">{ev.short_description}</p>
            </Section>
          )}

          {ev.full_description && (
            <Section title="Полное описание">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{ev.full_description}</p>
            </Section>
          )}

          {/* Программа */}
          {ev.program?.length > 0 && (
            <Section title="Программа">
              <ul className="flex flex-col gap-1">
                {ev.program.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-muted-foreground flex-shrink-0">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Правила */}
          {ev.rules?.length > 0 && (
            <Section title="Правила">
              <ul className="flex flex-col gap-1">
                {ev.rules.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-muted-foreground flex-shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Прочее */}
          <Section title="Дополнительно">
            <Row icon="Eye" label="Видимость" value={ev.is_visible ? "Видимое" : "Скрытое"} />
            <Row icon="Star" label="Рекомендуемое" value={ev.featured ? "Да" : "Нет"} />
            <Row icon="CalendarClock" label="Создано" value={ev.created_at ? new Date(ev.created_at).toLocaleString("ru-RU") : undefined} />
          </Section>
        </div>

        <div className="p-5 border-t">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full">Закрыть</Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <Icon name={icon as never} size={14} className="flex-shrink-0 mt-0.5 text-muted-foreground" />
      <span className="text-muted-foreground flex-shrink-0">{label}:</span>
      <span className="break-words min-w-0 text-gray-900">{value}</span>
    </div>
  );
}

export default function AdminEventModeration() {
  const [events, setEvents] = useState<EventWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<EventWithMeta | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [tgToggles, setTgToggles] = useState<Record<number, boolean>>({});
  const [detailEvent, setDetailEvent] = useState<EventWithMeta | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await organizerApi.getPendingModeration() as EventWithMeta[];
      setEvents(data);
      const defaults: Record<number, boolean> = {};
      data.forEach((ev) => { defaults[ev.id] = true; });
      setTgToggles(defaults);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (ev: EventWithMeta) => {
    setActionLoading(ev.id);
    try {
      await organizerApi.moderateEvent(ev.id, "approve", undefined, tgToggles[ev.id] ?? true);
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    try {
      await organizerApi.moderateEvent(rejectTarget.id, "reject", rejectReason);
      setEvents((prev) => prev.filter((e) => e.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason("");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleTg = (id: number) =>
    setTgToggles((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Модерация событий</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Заявки организаторов на публикацию
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="flex-shrink-0">
          <Icon name="RefreshCw" size={14} className="mr-1.5" />
          Обновить
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="CheckCircle" size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Нет событий на модерации</p>
          <p className="text-sm mt-1">Все заявки обработаны</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((ev) => {
            const tgOn = tgToggles[ev.id] ?? true;
            return (
              <div key={ev.id} className="bg-white rounded-xl border overflow-hidden">
                {/* Кликабельная часть карточки */}
                <button
                  type="button"
                  onClick={() => setDetailEvent(ev)}
                  className="w-full text-left p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex gap-3">
                    {ev.image_url && (
                      <img
                        src={ev.image_url}
                        alt={ev.title}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-tight break-words min-w-0 pr-1">{ev.title}</h3>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap flex items-center gap-1">
                            <Icon name="Clock" size={10} />
                            Ожидает
                          </span>
                          {ev.is_private ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 whitespace-nowrap flex items-center gap-1">
                              <Icon name="Lock" size={10} />
                              Приватное
                            </span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap flex items-center gap-1">
                              <Icon name="Globe" size={10} />
                              Публичное
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Icon name="Calendar" size={11} />
                          {ev.event_date}
                        </span>
                        {ev.start_time && (
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <Icon name="Clock" size={11} />
                            {ev.start_time}
                          </span>
                        )}
                        {ev.bath_name && (
                          <span className="flex items-center gap-1 min-w-0 truncate max-w-full">
                            <Icon name="MapPin" size={11} className="flex-shrink-0" />
                            <span className="truncate">{ev.bath_name}</span>
                          </span>
                        )}
                      </div>

                      {ev.organizer_name && (
                        <div className="mt-1 text-xs text-muted-foreground truncate">
                          <Icon name="User" size={11} className="inline mr-1" />
                          {ev.organizer_name}
                          {ev.organizer_email && (
                            <span className="ml-1 opacity-60 truncate">({ev.organizer_email})</span>
                          )}
                        </div>
                      )}

                      {ev.short_description && (
                        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{ev.short_description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium">
                    <Icon name="Eye" size={12} />
                    Нажмите для просмотра всех полей
                  </div>
                </button>

                {/* Action bar */}
                <div className="px-5 pb-5 flex flex-col gap-3 border-t pt-4">
                  {!ev.is_private && (
                    <button
                      type="button"
                      onClick={() => toggleTg(ev.id)}
                      className={`flex items-center gap-2.5 w-fit rounded-lg px-3 py-2 text-sm transition-colors border ${
                        tgOn
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-gray-50 border-gray-200 text-gray-500"
                      }`}
                    >
                      <div className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${tgOn ? "bg-blue-500" : "bg-gray-300"}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${tgOn ? "translate-x-4" : "translate-x-0.5"}`} />
                      </div>
                      <Icon name="Send" size={14} />
                      <span className="text-sm">
                        {tgOn ? "Отправить в Telegram" : "Не отправлять в Telegram"}
                      </span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(ev)}
                      disabled={actionLoading === ev.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {actionLoading === ev.id ? (
                        <Icon name="Loader2" size={14} className="animate-spin mr-1.5" />
                      ) : (
                        <Icon name="CheckCircle" size={14} className="mr-1.5" />
                      )}
                      Одобрить
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setRejectTarget(ev); setRejectReason(""); }}
                      disabled={actionLoading === ev.id}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Icon name="XCircle" size={14} className="mr-1.5" />
                      Отклонить
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {detailEvent && (
        <EventDetailModal ev={detailEvent} onClose={() => setDetailEvent(null)} />
      )}

      {/* Reject dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-1">Отклонить событие</h3>
            <p className="text-sm text-muted-foreground mb-4">
              «{rejectTarget.title}» — укажите причину, чтобы организатор мог исправить событие.
            </p>
            <textarea
              className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Причина отклонения (необязательно)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={actionLoading === rejectTarget.id}
              >
                {actionLoading === rejectTarget.id ? (
                  <Icon name="Loader2" size={14} className="animate-spin mr-1.5" />
                ) : null}
                Отклонить
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejectTarget(null)}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
