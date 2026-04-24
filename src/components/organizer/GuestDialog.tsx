import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { organizerApi, Guest, GuestMessage } from "@/lib/organizer-api";
import { useToast } from "@/hooks/use-toast";

const CHANNEL_ICON: Record<string, string> = {
  telegram: "Send",
  vk: "MessageCircle",
  email: "Mail",
  sms: "MessageSquare",
  site: "Globe",
};

const CHANNEL_LABEL: Record<string, string> = {
  telegram: "Telegram",
  vk: "ВКонтакте",
  email: "Email",
  sms: "SMS",
  site: "Сайт",
};

const TEMPLATES = [
  "Привет! Подтверди, пожалуйста, своё участие.",
  "Напоминаю: встреча завтра в 18:00. Ждём тебя!",
  "Ссылка для оплаты: ",
];

interface Props {
  guest: Guest | null;
  onClose: () => void;
}

export default function GuestDialog({ guest, onClose }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const channel = guest?.preferred_channel || "site";

  useEffect(() => {
    if (!guest) return;
    setMessages([]);
    setText("");
    setLoading(true);
    organizerApi.getMessages(guest.id)
      .then((data) => setMessages(data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guest?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!guest || !text.trim()) return;
    setSending(true);
    try {
      await organizerApi.sendMessages([guest.id], text.trim());
      const newMsg: GuestMessage = {
        id: Date.now(),
        direction: "out",
        channel,
        body: text.trim(),
        delivered: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      setText("");
    } catch {
      toast({ title: "Ошибка отправки", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  if (!guest) return null;

  return (
    <Dialog open={!!guest} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Icon name="MessageCircle" size={18} />
            Диалог с {guest.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <Icon name={CHANNEL_ICON[channel] || "Globe"} size={14} />
            Канал доставки: {CHANNEL_LABEL[channel] || channel}
            {guest.telegram && channel === "telegram" && (
              <span className="text-xs opacity-70">({guest.telegram})</span>
            )}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2 space-y-2">
          {loading && (
            <div className="flex justify-center py-8">
              <Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              История диалога пуста. Напишите первым!
            </p>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === "out" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  msg.direction === "out"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                <p className={`text-[10px] mt-1 ${msg.direction === "out" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {formatTime(msg.created_at)}
                  {msg.direction === "out" && (
                    <span className="ml-1">
                      <Icon name={CHANNEL_ICON[msg.channel] || "Globe"} size={10} className="inline" />
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 border-t pt-3 space-y-2">
          <div className="flex gap-1 flex-wrap">
            {TEMPLATES.map((t) => (
              <button
                key={t}
                onClick={() => setText(t)}
                className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors truncate max-w-[160px]"
              >
                {t.length > 28 ? t.slice(0, 27) + "…" : t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Введите сообщение..."
              className="min-h-[56px] max-h-[120px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
              }}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="self-end shrink-0"
            >
              {sending
                ? <Icon name="Loader2" size={16} className="animate-spin" />
                : <Icon name="Send" size={16} />
              }
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Ctrl+Enter — отправить</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
