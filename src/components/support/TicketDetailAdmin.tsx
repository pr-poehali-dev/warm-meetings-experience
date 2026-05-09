import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Icon from "@/components/ui/icon";
import AuditLogPanel from "@/components/admin/AuditLogPanel";
import {
  supportAdminApi,
  AdminTicket,
  SupportMessage,
  SupportTemplate,
  TicketStatus,
  TicketPriority,
  AttachmentInfo,
} from "@/lib/support-api";
import AttachmentPicker from "@/components/support/AttachmentPicker";
import AttachmentBubble from "@/components/support/AttachmentBubble";
import { toast } from "sonner";
import { STATUS_META, CATEGORY_LABELS, formatDateTime } from "./SupportConstants";

export default function TicketDetailAdmin({
  ticketId,
  onBack,
}: {
  ticketId: number;
  onBack: () => void;
}) {
  const [ticket, setTicket] = useState<AdminTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [templates, setTemplates] = useState<SupportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [attachment, setAttachment] = useState<AttachmentInfo | null>(null);
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await supportAdminApi.getTicket(ticketId);
      setTicket(data.ticket);
      setMessages(data.messages);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить");
      onBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    supportAdminApi.listTemplates().then(setTemplates).catch(() => {});
  }, [ticketId]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const sendReply = async () => {
    if ((!reply.trim() && !attachment) || sending) return;
    setSending(true);
    try {
      const m = await supportAdminApi.postMessage(
        ticketId,
        reply.trim(),
        attachment ? { url: attachment.url, name: attachment.filename } : null
      );
      setMessages((prev) => [...prev, m]);
      setReply("");
      setAttachment(null);
      if (ticket) setTicket({ ...ticket, status: "awaiting_reply" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: TicketStatus) => {
    try {
      await supportAdminApi.setStatus(ticketId, status);
      toast.success("Статус обновлён");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось");
    }
  };

  const changePriority = async (priority: TicketPriority) => {
    try {
      await supportAdminApi.setPriority(ticketId, priority);
      if (ticket) setTicket({ ...ticket, priority });
      toast.success("Приоритет обновлён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        <Icon name="Loader2" size={20} className="animate-spin mx-auto mb-2" />
        Открываем тикет…
      </div>
    );
  }
  if (!ticket) return null;

  const meta = STATUS_META[ticket.status];

  return (
    <div className="space-y-3 p-4 sm:p-6">
      <SheetHeader className="text-left">
        <SheetTitle className="text-base flex items-center gap-2">
          <Icon name="LifeBuoy" size={16} className="text-muted-foreground" />
          Тикет #{ticket.id}
        </SheetTitle>
      </SheetHeader>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">
                #{ticket.id} · {CATEGORY_LABELS[ticket.category] || ticket.category} ·{" "}
                {formatDateTime(ticket.created_at)}
              </div>
              <h2 className="text-lg font-semibold leading-snug">{ticket.subject}</h2>
              <div className="text-sm text-muted-foreground">
                {ticket.name || "—"} · {ticket.email}
                {ticket.user_id ? ` · user #${ticket.user_id}` : " · гость"}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${meta.cls}`}>
              {meta.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <select
              value={ticket.status}
              onChange={(e) => changeStatus(e.target.value as TicketStatus)}
              className="h-8 px-2 rounded-md border border-input bg-background text-xs"
            >
              <option value="open">Статус: Открыт</option>
              <option value="in_progress">Статус: В работе</option>
              <option value="awaiting_reply">Статус: Ждёт пользователя</option>
              <option value="closed">Статус: Закрыт</option>
            </select>
            <select
              value={ticket.priority}
              onChange={(e) => changePriority(e.target.value as TicketPriority)}
              className="h-8 px-2 rounded-md border border-input bg-background text-xs"
            >
              <option value="low">Приоритет: Низкий</option>
              <option value="medium">Приоритет: Средний</option>
              <option value="high">Приоритет: Высокий</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <AuditLogPanel entityType="ticket" entityId={ticket.id} />
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-4 space-y-3">
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
              const isAdmin = m.author_type === "admin";
              return (
                <div
                  key={m.id}
                  className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      isAdmin
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    <div className="text-[10px] opacity-75 mb-0.5">
                      {isAdmin ? "Поддержка" : "Пользователь"} ·{" "}
                      {formatDateTime(m.created_at)}
                    </div>
                    {m.message && <div className="whitespace-pre-line">{m.message}</div>}
                    {m.attachment_url && (
                      <AttachmentBubble
                        url={m.attachment_url}
                        name={m.attachment_name}
                        onLight={isAdmin}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border p-3 space-y-2">
            {showTemplates && templates.length > 0 && (
              <div className="border border-border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1 bg-muted/30">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setReply((prev) => (prev ? prev + "\n\n" + t.body : t.body));
                      setShowTemplates(false);
                    }}
                    className="w-full text-left p-2 rounded-md hover:bg-background transition-colors"
                  >
                    <div className="text-xs font-medium">{t.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2">
                      {t.body}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Ответ пользователю…"
              rows={4}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  sendReply();
                }
              }}
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTemplates((v) => !v)}
                >
                  <Icon name="FileText" size={14} className="mr-1" />
                  Шаблоны ({templates.length})
                </Button>
                <AttachmentPicker
                  attachment={attachment}
                  onChange={setAttachment}
                  compact
                />
              </div>
              <Button
                size="sm"
                onClick={sendReply}
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
            <div className="text-[11px] text-muted-foreground">
              Cmd/Ctrl + Enter — отправить. После ответа статус станет «Ждёт пользователя».
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
