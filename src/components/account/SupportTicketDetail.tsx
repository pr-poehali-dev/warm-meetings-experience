import { useEffect, useRef, useState } from "react";
import { useConfirm } from "@/hooks/useConfirm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import {
  supportApi,
  Ticket,
  SupportMessage,
  TicketStatus,
  AttachmentInfo,
} from "@/lib/support-api";
import AttachmentPicker from "@/components/support/AttachmentPicker";
import AttachmentBubble from "@/components/support/AttachmentBubble";
import { toast } from "sonner";

const STATUS_META: Record<TicketStatus, { label: string; cls: string }> = {
  open: { label: "Открыт", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  in_progress: { label: "В работе", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  awaiting_reply: { label: "Ждём вас", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-400" },
  closed: { label: "Закрыт", cls: "bg-muted text-muted-foreground" },
};

function formatDateTime(s: string) {
  try {
    const d = new Date(s);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export default function SupportTicketDetail({
  ticketId,
  onBack,
}: {
  ticketId: number;
  onBack: () => void;
}) {
  const [showConfirm, ConfirmDialog] = useConfirm();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [attachment, setAttachment] = useState<AttachmentInfo | null>(null);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await supportApi.getTicket(ticketId);
      setTicket(data.ticket);
      setMessages(data.messages);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить тикет");
      onBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [ticketId]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const send = async () => {
    if ((!reply.trim() && !attachment) || sending) return;
    setSending(true);
    try {
      const m = await supportApi.postMessage(
        ticketId,
        reply.trim(),
        attachment ? { url: attachment.url, name: attachment.filename } : null
      );
      setMessages((prev) => [...prev, m]);
      setReply("");
      setAttachment(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    if (!(await showConfirm({ title: "Закрыть обращение?", description: "После закрытия открыть его заново нельзя.", confirmLabel: "Закрыть" }))) return;
    setClosing(true);
    try {
      await supportApi.closeTicket(ticketId);
      toast.success("Обращение закрыто");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось закрыть");
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        <Icon name="Loader2" size={20} className="animate-spin mx-auto mb-2" />
        Открываем переписку…
      </div>
    );
  }

  if (!ticket) return null;

  const meta = STATUS_META[ticket.status];
  const isClosed = ticket.status === "closed";

  return (
    <div className="space-y-3">
      {ConfirmDialog}
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        >
          <Icon name="ArrowLeft" size={16} />
          К списку
        </button>
        <span className={`text-xs px-2 py-0.5 rounded-full ${meta.cls}`}>
          {meta.label}
        </span>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">
            Обращение #{ticket.id} · создано {formatDateTime(ticket.created_at)}
          </div>
          <h2 className="text-lg font-semibold leading-snug">{ticket.subject}</h2>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-4 space-y-3">
            {messages.map((m) => {
              if (m.is_system || m.author_type === "system") {
                return (
                  <div key={m.id} className="text-center">
                    <span className="inline-block text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {m.message} · {formatDateTime(m.created_at)}
                    </span>
                  </div>
                );
              }
              const isMine = m.author_type === "user";
              return (
                <div
                  key={m.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    <div className="text-[10px] opacity-75 mb-0.5">
                      {isMine ? "Вы" : "Поддержка"} · {formatDateTime(m.created_at)}
                    </div>
                    {m.message && <div className="whitespace-pre-line">{m.message}</div>}
                    {m.attachment_url && (
                      <AttachmentBubble
                        url={m.attachment_url}
                        name={m.attachment_name}
                        onLight={isMine}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!isClosed && (
            <div className="border-t border-border p-3 space-y-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Напишите ответ…"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <AttachmentPicker attachment={attachment} onChange={setAttachment} />
                <div className="flex gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={closeTicket}
                    disabled={closing}
                  >
                    {closing ? (
                      <Icon name="Loader2" size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Icon name="Check" size={14} className="mr-1" />
                        Решено
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={send}
                    disabled={sending || (!reply.trim() && !attachment)}
                  >
                    {sending ? (
                      <Icon name="Loader2" size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Icon name="Send" size={14} className="mr-1" />
                        Отправить
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isClosed && (
            <div className="border-t border-border p-4 text-center text-xs text-muted-foreground">
              Это обращение закрыто. Если появятся новые вопросы — создайте новое.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}