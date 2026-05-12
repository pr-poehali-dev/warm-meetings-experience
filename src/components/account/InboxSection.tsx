import { useEffect, useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { userProfileApi, InboxMessage } from "@/lib/user-api";

const CHANNEL_LABEL: Record<string, string> = {
  site: "На сайте",
  vk: "ВКонтакте",
  telegram: "Telegram",
  email: "Email",
};

const CHANNEL_ICON: Record<string, string> = {
  site: "Globe",
  vk: "MessageCircle",
  telegram: "Send",
  email: "Mail",
};

interface ThreadGroup {
  key: string;
  kind: "signup" | "question";
  signup_id: number | null;
  question_id: number | null;
  event_id: number;
  event_title: string;
  organizer_name: string;
  organizer_avatar: string | null;
  messages: InboxMessage[];
  unread: number;
  lastAt: string;
}

export default function InboxSection() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { messages: m } = await userProfileApi.getInbox();
      setMessages(m);
    } catch {
      // тихо
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const threads = useMemo<ThreadGroup[]>(() => {
    const map = new Map<string, ThreadGroup>();
    for (const m of messages) {
      const isQuestion = m.kind === "question_answer";
      const key = isQuestion ? `q_${m.question_id}` : `s_${m.signup_id}`;
      let t = map.get(key);
      if (!t) {
        t = {
          key,
          kind: isQuestion ? "question" : "signup",
          signup_id: isQuestion ? null : m.signup_id,
          question_id: isQuestion ? (m.question_id ?? null) : null,
          event_id: m.event_id,
          event_title: m.event_title,
          organizer_name: m.organizer_name,
          organizer_avatar: m.organizer_avatar,
          messages: [],
          unread: 0,
          lastAt: m.created_at,
        };
        map.set(key, t);
      }
      t.messages.push(m);
      if (m.direction === "out" && !m.read_at) t.unread += 1;
      if (new Date(m.created_at) > new Date(t.lastAt)) t.lastAt = m.created_at;
    }
    return Array.from(map.values()).sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
  }, [messages]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const openDialog = async (thread: ThreadGroup) => {
    setOpenThread(thread.key);
    setReply("");
    try {
      if (thread.kind === "question" && thread.question_id) {
        await userProfileApi.inboxRead({ question_id: thread.question_id });
        setMessages((prev) =>
          prev.map((m) =>
            m.kind === "question_answer" && m.question_id === thread.question_id && !m.read_at
              ? { ...m, read_at: new Date().toISOString() }
              : m
          )
        );
      } else if (thread.signup_id) {
        await userProfileApi.inboxRead({ signup_id: thread.signup_id });
        setMessages((prev) =>
          prev.map((m) => (m.signup_id === thread.signup_id && m.direction === "out" && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m)),
        );
      }
    } catch {
      // тихо
    }
  };

  const handleReply = async () => {
    if (!openThread || !reply.trim()) return;
    const thread = threads.find((t) => t.key === openThread);
    if (!thread) return;

    // Для веток-вопросов ответа в чат пока нет — пользователь может задать новый вопрос на странице события
    if (thread.kind === "question" || !thread.signup_id) {
      toast({ title: "Чтобы продолжить переписку, задайте новый вопрос на странице события" });
      return;
    }

    setSending(true);
    try {
      const res = await userProfileApi.inboxReply(thread.signup_id, reply.trim());
      const newMsg: InboxMessage = {
        id: res.id,
        signup_id: thread.signup_id,
        event_id: thread.event_id,
        direction: "in",
        channel: "site",
        body: reply.trim(),
        delivered: true,
        created_at: res.created_at,
        read_at: new Date().toISOString(),
        event_title: thread.event_title,
        event_date: null,
        start_time: null,
        organizer_id: 0,
        organizer_name: thread.organizer_name,
        organizer_avatar: thread.organizer_avatar,
      };
      setMessages((prev) => [newMsg, ...prev]);
      setReply("");
      toast({ title: "Ответ отправлен" });
    } catch {
      toast({ title: "Не удалось отправить", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed rounded-xl">
        <Icon name="Inbox" size={24} className="mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">Сообщений пока нет</p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs mx-auto">Здесь будут сообщения от организаторов мероприятий, на которые вы записаны</p>
      </div>
    );
  }

  const activeThread = threads.find((t) => t.key === openThread);

  return (
    <div className="space-y-3">
      {!activeThread ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Icon name="Inbox" size={16} />
              Сообщения от организаторов
            </h3>
            <Button variant="ghost" size="sm" onClick={load} className="h-7 px-2">
              <Icon name="RefreshCw" size={13} />
            </Button>
          </div>
          <div className="space-y-2">
            {threads.map((t) => {
              const last = t.messages[0];
              return (
                <button
                  key={t.key}
                  onClick={() => openDialog(t)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors hover:bg-muted/40 ${t.unread > 0 ? "border-primary/30 bg-primary/5" : "border-border"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {t.organizer_avatar ? (
                        <img src={t.organizer_avatar} alt={t.organizer_name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="User" size={16} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{t.organizer_name}</span>
                        {t.kind === "question" && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Ответ на вопрос</span>
                        )}
                        {t.unread > 0 && (
                          <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                            {t.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{t.event_title}</p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-1">
                        {last.direction === "in" ? "Вы: " : ""}{last.body}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(t.lastAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpenThread(null)} className="h-7 px-2">
              <Icon name="ChevronLeft" size={14} />
              Назад
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{activeThread.organizer_name}</p>
              <p className="text-xs text-muted-foreground truncate">{activeThread.event_title}</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {activeThread.kind === "question" && activeThread.messages[0]?.original_question && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-primary/10 text-foreground border border-primary/20">
                  <p className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold mb-1">Ваш вопрос</p>
                  <p className="whitespace-pre-wrap break-words">{activeThread.messages[0].original_question}</p>
                </div>
              </div>
            )}
            {[...activeThread.messages].reverse().map((m) => (
              <div key={m.id} className={`flex ${m.direction === "in" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.direction === "in" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 flex items-center gap-1 ${m.direction === "in" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatTime(m.created_at)}
                    <Icon name={CHANNEL_ICON[m.channel] || "Globe"} size={9} />
                    {CHANNEL_LABEL[m.channel] || m.channel}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {activeThread.kind === "question" ? (
            <div className="border-t pt-3 text-xs text-muted-foreground text-center">
              <Icon name="Info" size={12} className="inline mr-1" />
              Чтобы продолжить общение — задайте новый вопрос на странице события.
            </div>
          ) : (
            <div className="border-t pt-2 space-y-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Ответить организатору..."
                className="min-h-[60px] resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleReply();
                }}
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Ctrl+Enter — отправить</span>
                <Button size="sm" onClick={handleReply} disabled={sending || !reply.trim()} className="gap-1.5">
                  {sending ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Send" size={14} />}
                  Отправить
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}