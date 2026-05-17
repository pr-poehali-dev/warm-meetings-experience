import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { organizerApi, GuestMessage } from "@/lib/organizer-api";

interface Props {
  open: boolean;
  signupId: number | null;
  guestName: string;
  guestChannel?: string | null;
  guestPhone?: string | null;
  guestTelegram?: string | null;
  guestEmail?: string | null;
  onClose: () => void;
}

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  telegram: "Telegram",
  vk: "ВКонтакте",
  site: "Личный кабинет",
  auto: "Авто",
};

const CHANNEL_ICON: Record<string, string> = {
  email: "Mail",
  telegram: "Send",
  vk: "MessageCircle",
  site: "Globe",
  auto: "Sparkles",
};

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function GuestChatDialog({
  open,
  signupId,
  guestName,
  guestChannel,
  guestPhone,
  guestTelegram,
  guestEmail,
  onClose,
}: Props) {
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const [kbOffset, setKbOffset] = useState(0);

  const preferred = (guestChannel || "auto").toLowerCase();
  const channelLabel = CHANNEL_LABEL[preferred] || preferred;
  const channelIcon = CHANNEL_ICON[preferred] || "Send";

  const load = useCallback(async () => {
    if (!signupId) return;
    setLoading(true);
    try {
      const r = await organizerApi.getMessages(signupId);
      setMessages(r.messages || []);
    } catch (e) {
      toast.error("Не удалось загрузить переписку: " + String(e));
    } finally {
      setLoading(false);
    }
  }, [signupId]);

  useEffect(() => {
    if (open && signupId) {
      setText("");
      load();
    }
  }, [open, signupId, load]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Подстройка под экранную клавиатуру на мобильных (visualViewport)
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      setKbOffset(diff > 80 ? diff : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setKbOffset(0);
    };
  }, [open]);

  const handleFocus = () => {
    setTimeout(() => {
      inputBarRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }, 300);
  };

  const handleSend = async () => {
    console.log("[GuestChat] send click", { signupId, text, sending });
    if (sending) return;
    if (!signupId) {
      toast.error("Не выбран гость (signup_id отсутствует)");
      return;
    }
    const body = text.trim();
    if (!body) {
      toast.error("Введите текст сообщения");
      return;
    }
    setSending(true);
    try {
      console.log("[GuestChat] calling sendMessages", [signupId], body);
      const r = await organizerApi.sendMessages([signupId], body);
      console.log("[GuestChat] response", r);
      const sent = r.sent?.[0];
      if (sent?.delivered) {
        toast.success(`Отправлено через ${CHANNEL_LABEL[sent.channel] || sent.channel}`);
      } else if (sent?.error) {
        toast.error("Не доставлено: " + sent.error);
      } else {
        toast.success("Сообщение отправлено");
      }
      setText("");
      await load();
    } catch (e) {
      console.error("[GuestChat] send error", e);
      toast.error("Ошибка отправки: " + String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-lg w-[calc(100vw-1rem)] sm:w-auto p-0 flex flex-col"
        style={{ maxHeight: kbOffset > 0 ? `calc(100vh - ${kbOffset}px - 1rem)` : "90vh" }}
      >
        <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
              {(guestName || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate font-semibold">{guestName || "Гость"}</div>
              <div className="text-[11px] font-normal text-muted-foreground flex items-center gap-1">
                <Icon name={channelIcon} size={11} />
                <span>Канал: {channelLabel}</span>
              </div>
            </div>
          </DialogTitle>
          {(guestPhone || guestTelegram || guestEmail) && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground pl-11">
              {guestPhone && <span className="flex items-center gap-1"><Icon name="Phone" size={10} />{guestPhone}</span>}
              {guestTelegram && <span className="flex items-center gap-1"><Icon name="Send" size={10} />{guestTelegram}</span>}
              {guestEmail && <span className="flex items-center gap-1 truncate max-w-[200px]"><Icon name="Mail" size={10} />{guestEmail}</span>}
            </div>
          )}
        </DialogHeader>

        {/* Лента сообщений */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-muted/30 min-h-[280px]">
          {loading && messages.length === 0 ? (
            <div className="flex justify-center py-10"><Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-10">
              Переписки пока нет.<br />Напишите гостю — он получит сообщение в {channelLabel.toLowerCase()} со ссылкой для ответа.
            </div>
          ) : (
            messages.map((m) => {
              const isOut = m.direction === "out";
              return (
                <div key={m.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      isOut
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-white border rounded-bl-md"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className={`flex items-center gap-1 mt-1 text-[10px] ${isOut ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      <Icon name={CHANNEL_ICON[m.channel] || "Send"} size={9} />
                      <span>{CHANNEL_LABEL[m.channel] || m.channel}</span>
                      <span>·</span>
                      <span>{fmtTime(m.created_at)}</span>
                      {isOut && m.delivered === true && <Icon name="CheckCheck" size={11} className="ml-0.5" />}
                      {isOut && m.delivered === false && <Icon name="AlertCircle" size={11} className="ml-0.5 text-amber-300" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Поле ввода */}
        <div
          ref={inputBarRef}
          className="border-t p-3 space-y-2 bg-background shrink-0"
        >
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={handleFocus}
            placeholder={`Напишите сообщение — гость получит его в ${channelLabel.toLowerCase()} со ссылкой для ответа`}
            rows={2}
            className="resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] text-muted-foreground hidden sm:block">
              ⌘ + Enter — отправить
            </div>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="gap-1.5 h-9 ml-auto"
            >
              {sending ? (
                <Icon name="Loader2" size={14} className="animate-spin" />
              ) : (
                <Icon name="Send" size={14} />
              )}
              Отправить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}