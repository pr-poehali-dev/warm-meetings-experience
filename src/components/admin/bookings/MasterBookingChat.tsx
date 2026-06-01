import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { masterChatApi, ChatMessage, ChatSource } from "@/lib/master-calendar-api";

interface Props {
  open: boolean;
  masterId: number;
  bookingId: number | null;
  guestName: string;
  source?: ChatSource;
  onClose: () => void;
}

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

const MasterBookingChat = ({ open, masterId, bookingId, guestName, source = "booking", onClose }: Props) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!bookingId) return;
    try {
      const r = await masterChatApi.getMessages(bookingId, source);
      setMessages(r.messages || []);
    } catch (e) {
      toast.error("Не удалось загрузить переписку: " + String(e));
    } finally {
      setLoading(false);
    }
  }, [bookingId, source]);

  useEffect(() => {
    if (open && bookingId) {
      setText("");
      setLoading(true);
      load();
    }
  }, [open, bookingId, load]);

  // Поллинг для «реалтайма» — пока окно открыто, обновляем раз в 7 сек.
  useEffect(() => {
    if (!open || !bookingId) return;
    const t = setInterval(load, 7000);
    return () => clearInterval(t);
  }, [open, bookingId, load]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (sending || !bookingId) return;
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await masterChatApi.send(masterId, bookingId, body, source);
      setText("");
      await load();
    } catch (e) {
      toast.error("Ошибка отправки: " + String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg w-[calc(100vw-1rem)] sm:w-auto p-0 flex flex-col" style={{ maxHeight: "90vh" }}>
        <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
              {(guestName || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate font-semibold">{guestName || "Гость"}</div>
              <div className="text-[11px] font-normal text-muted-foreground flex items-center gap-1">
                <Icon name="MessageCircle" size={11} />
                <span>Чат по записи</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-muted/30 min-h-[280px]">
          {loading && messages.length === 0 ? (
            <div className="flex justify-center py-10">
              <Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-10">
              Переписки пока нет.<br />Напишите гостю — он увидит сообщение по ссылке на чат.
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
                    <div
                      className={`flex items-center gap-1 mt-1 text-[10px] ${
                        isOut ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      <span>{fmtTime(m.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t p-3 space-y-2 bg-background shrink-0">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Напишите сообщение гостю…"
            rows={2}
            maxLength={5000}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Ctrl+Enter — отправить</span>
            <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()} className="gap-1.5">
              {sending ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Send" size={14} />}
              Отправить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MasterBookingChat;