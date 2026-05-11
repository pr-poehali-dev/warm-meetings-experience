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
  signup_id: number;
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
  const [openThread, setOpenThread] = useState<number | null>(null);
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
    const map = new Map<number, ThreadGroup>();
    for (const m of messages) {
      let t = map.get(m.signup_id);
      if (!t) {
        t = {
          signup_id: m.signup_id,
          event_id: m.event_id,
          event_title: m.event_title,
          organizer_name: m.organizer_name,
          organizer_avatar: m.organizer_avatar,
          messages: [],
          unread: 0,
          lastAt: m.created_at,
        };
        map.set(m.signup_id, t);
      }
      t.messages.push(m);
      if (m.direction === "out" && !m.read_at) t.unread += 1;
      if (new Date(m.created_at) > new Date(t.lastAt)) t.lastAt = m.created_at;
    }
    return Array.from(map.values()).sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
  }, [messages]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const openDialog = async (signupId: number) => {
    setOpenThread(signupId);
    setReply("");
    // помечаем прочитанным
    try {
      await userProfileApi.inboxRead({ signup_id: signupId });
      setMessages((prev) =>
        prev.map((m) => (m.signup_id === signupId && m.direction === "out" && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m)),
      );
    } catch {
      // тихо
    }
  };

  const handleReply = async () => {
    if (!openThread || !reply.trim()) return;
    setSending(true);
    try {
      const res = await userProfileApi.inboxReply(openThread, reply.trim());
      const thread = threads.find((t) => t.signup_id === openThread);
      if (thread) {
        const newMsg: InboxMessage = {
          id: res.id,
          signup_id: openThread,
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
      }
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

  const activeThread = threads.find((t) => t.signup_id === openThread);

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
                  key={t.signup_id}
                  onClick={() => openDialog(t.signup_id)}
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
        </div>
      )}
    </div>
  );
}