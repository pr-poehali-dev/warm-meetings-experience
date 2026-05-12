/**
 * Раздел кабинета организатора: «Вопросы по событиям».
 * Гости со страницы события могут задать вопрос — он попадает сюда.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  organizerApi,
  EventQuestion,
  EventQuestionStatus,
} from "@/lib/organizer-api";

type Filter = "all" | "new" | "read" | "answered";

const STATUS_META: Record<EventQuestionStatus, { label: string; cls: string; icon: string }> = {
  new: { label: "Новый", cls: "bg-orange-100 text-orange-700 border-orange-200", icon: "Sparkles" },
  read: { label: "Прочитан", cls: "bg-blue-50 text-blue-700 border-blue-200", icon: "Eye" },
  answered: { label: "Отвечен", cls: "bg-green-50 text-green-700 border-green-200", icon: "CheckCircle2" },
};

function ContactBlock({ q }: { q: EventQuestion }) {
  const icon =
    q.contact_type === "email" ? "Mail" :
    q.contact_type === "phone" ? "Phone" : "Send";
  const href =
    q.contact_type === "email" ? `mailto:${q.guest_contact}` :
    q.contact_type === "phone" ? `tel:${q.guest_contact.replace(/[^\d+]/g, "")}` :
    q.guest_contact.startsWith("@") ? `https://t.me/${q.guest_contact.slice(1)}` : undefined;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon name={icon} size={14} className="text-muted-foreground shrink-0" />
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
          {q.guest_contact}
        </a>
      ) : (
        <span className="truncate">{q.guest_contact}</span>
      )}
    </div>
  );
}

export default function EventQuestionsSection() {
  const [questions, setQuestions] = useState<EventQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [answeringId, setAnsweringId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [sendingAnswer, setSendingAnswer] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await organizerApi.listEventQuestions(
        filter !== "all" ? { status: filter as EventQuestionStatus } : undefined
      );
      setQuestions(r.questions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось загрузить вопросы");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const all = questions.length;
    const newCount = questions.filter((q) => q.status === "new").length;
    return { all, new: newCount };
  }, [questions]);

  const update = async (id: number, action: "mark_read" | "mark_answered" | "reopen") => {
    setBusyId(id);
    try {
      await organizerApi.updateEventQuestion(id, action);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось обновить статус");
    } finally {
      setBusyId(null);
    }
  };

  const openAnswer = (q: EventQuestion) => {
    setAnsweringId(q.id);
    setAnswerText(q.answer_text || "");
  };

  const cancelAnswer = () => {
    setAnsweringId(null);
    setAnswerText("");
  };

  const sendAnswer = async (q: EventQuestion) => {
    const text = answerText.trim();
    if (text.length < 2 || sendingAnswer) return;
    setSendingAnswer(true);
    try {
      const r = await organizerApi.answerEventQuestion(q.id, text);
      if (r.delivered) {
        if (r.channel === "site") {
          toast.success("Ответ отправлен — гость увидит его в своём кабинете");
        } else if (r.channel === "email") {
          toast.success("Ответ отправлен на email гостя");
        } else {
          toast.success("Ответ сохранён");
        }
      } else {
        toast.warning(
          r.note === "sms_not_configured"
            ? "Канал SMS не подключён — ответ сохранён, но не доставлен. Свяжитесь с гостем по телефону."
            : r.note === "telegram_not_supported"
              ? "Ответ через Telegram пока не поддерживается. Свяжитесь с гостем напрямую."
              : "Ответ сохранён, но не доставлен. Свяжитесь с гостем напрямую."
        );
      }
      cancelAnswer();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось отправить ответ");
    } finally {
      setSendingAnswer(false);
    }
  };

  const deliveryHint = (q: EventQuestion): { icon: string; text: string } => {
    if (q.guest_user_id) {
      return { icon: "User", text: "Ответ будет доставлен в личный кабинет гостя" };
    }
    if (q.contact_type === "email") {
      return { icon: "Mail", text: "Ответ будет отправлен на email гостя" };
    }
    if (q.contact_type === "phone") {
      return { icon: "Phone", text: "SMS-канал не подключён — лучше позвонить" };
    }
    return { icon: "Send", text: "Ответ через Telegram пока вручную — свяжитесь с гостем" };
  };

  const formatDate = (s: string) => {
    try {
      return format(parseISO(s), "d MMMM, HH:mm", { locale: ru });
    } catch {
      return s;
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Icon name="MessageCircleQuestion" size={22} />
            Вопросы по событиям
          </h2>
          <p className="text-sm text-muted-foreground">
            Сообщения от гостей со страниц ваших событий
            {counts.new > 0 && (
              <span className="ml-1.5 text-orange-700 font-medium">— {counts.new} новых</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <Icon name={loading ? "Loader2" : "RefreshCw"} size={14} className={loading ? "animate-spin" : ""} />
          Обновить
        </Button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {(["all", "new", "read", "answered"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground/40"
            }`}
          >
            {f === "all" ? "Все" : f === "new" ? "Новые" : f === "read" ? "Прочитанные" : "Отвеченные"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : questions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Icon name="Inbox" size={24} className="text-muted-foreground" />
            </div>
            <h3 className="font-semibold">Пока вопросов нет</h3>
            <p className="text-sm text-muted-foreground">
              Когда гость нажмёт «Задать вопрос» на странице события — сообщение появится здесь.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const st = STATUS_META[q.status] || STATUS_META.new;
            const eventUrl = q.event_slug ? `/events/${q.event_slug}` : `/events/${q.event_id}`;
            return (
              <Card key={q.id} className={q.status === "new" ? "border-orange-200" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${st.cls} inline-flex items-center gap-1`}>
                          <Icon name={st.icon} size={11} />
                          {st.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(q.created_at)}</span>
                        {q.email_sent && (
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            <Icon name="Mail" size={11} />
                            письмо отправлено
                          </span>
                        )}
                      </div>
                      <a
                        href={eventUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold mt-1 inline-flex items-center gap-1 hover:underline"
                      >
                        {q.event_title}
                        <Icon name="ExternalLink" size={12} className="text-muted-foreground" />
                      </a>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {q.guest_name}
                        {q.guest_user_id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                            <Icon name="UserCheck" size={10} />
                            на сайте
                          </span>
                        )}
                      </div>
                      <ContactBlock q={q} />
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{q.message}</div>
                  </div>

                  {q.answer_text && answeringId !== q.id && (
                    <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 space-y-1.5">
                      <div className="text-[11px] text-green-700 font-semibold flex items-center gap-1.5">
                        <Icon name="CheckCircle2" size={12} />
                        Ваш ответ
                        {q.answer_sent_at && (
                          <span className="text-muted-foreground font-normal">· {formatDate(q.answer_sent_at)}</span>
                        )}
                        {q.answer_channel === "site" && (
                          <span className="text-muted-foreground font-normal">· в кабинет</span>
                        )}
                        {q.answer_channel === "email" && (
                          <span className="text-muted-foreground font-normal">· на email</span>
                        )}
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-green-950">
                        {q.answer_text}
                      </div>
                    </div>
                  )}

                  {answeringId === q.id ? (
                    <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3 space-y-2">
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Icon name={deliveryHint(q).icon} size={12} />
                        {deliveryHint(q).text}
                      </div>
                      <Textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        rows={4}
                        autoFocus
                        placeholder="Напишите ответ гостю..."
                      />
                      <div className="flex gap-2 flex-wrap justify-end">
                        <Button size="sm" variant="ghost" onClick={cancelAnswer} disabled={sendingAnswer}>
                          Отмена
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => sendAnswer(q)}
                          disabled={answerText.trim().length < 2 || sendingAnswer}
                        >
                          {sendingAnswer ? (
                            <>
                              <Icon name="Loader2" size={14} className="animate-spin" />
                              Отправляем...
                            </>
                          ) : (
                            <>
                              <Icon name="Send" size={14} />
                              Отправить ответ
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {q.status === "new" && (
                        <Button size="sm" variant="outline" onClick={() => update(q.id, "mark_read")} disabled={busyId === q.id}>
                          <Icon name="Eye" size={14} />
                          Прочитано
                        </Button>
                      )}
                      <Button size="sm" onClick={() => openAnswer(q)} disabled={busyId === q.id}>
                        <Icon name={q.answer_text ? "Pencil" : "Reply"} size={14} />
                        {q.answer_text ? "Изменить ответ" : "Ответить"}
                      </Button>
                      {q.status !== "answered" && (
                        <Button size="sm" variant="outline" onClick={() => update(q.id, "mark_answered")} disabled={busyId === q.id}>
                          <Icon name="CheckCircle2" size={14} />
                          Отметить «Отвечен»
                        </Button>
                      )}
                      {q.status === "answered" && (
                        <Button size="sm" variant="ghost" onClick={() => update(q.id, "reopen")} disabled={busyId === q.id}>
                          <Icon name="RotateCcw" size={14} />
                          Вернуть в работу
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}