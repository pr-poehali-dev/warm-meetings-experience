import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
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

const STATUS_LIST: { value: TicketStatus | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "open", label: "Открыты" },
  { value: "in_progress", label: "В работе" },
  { value: "awaiting_reply", label: "Ждут пользователя" },
  { value: "closed", label: "Закрытые" },
];

const STATUS_META: Record<TicketStatus, { label: string; cls: string }> = {
  open: { label: "Открыт", cls: "bg-amber-100 text-amber-700" },
  in_progress: { label: "В работе", cls: "bg-blue-100 text-blue-700" },
  awaiting_reply: { label: "Ждём пользователя", cls: "bg-violet-100 text-violet-700" },
  closed: { label: "Закрыт", cls: "bg-slate-100 text-slate-600" },
};

const PRIORITY_META: Record<TicketPriority, { label: string; cls: string }> = {
  low: { label: "Низкий", cls: "text-slate-500" },
  medium: { label: "Средний", cls: "text-blue-600" },
  high: { label: "Высокий", cls: "text-rose-600 font-semibold" },
};

const CATEGORY_LABELS: Record<string, string> = {
  booking: "Бронирование",
  payment: "Оплата",
  tech: "Техника",
  idea: "Предложение",
  other: "Другое",
};

function formatDateTime(s: string) {
  try {
    return new Date(s).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export default function AdminSupport() {
  const [view, setView] = useState<"tickets" | "templates">("tickets");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Icon name="LifeBuoy" size={22} />
          Служба поддержки
        </h1>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("tickets")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "tickets" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Обращения
          </button>
          <button
            onClick={() => setView("templates")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "templates" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Шаблоны
          </button>
        </div>
      </div>

      {view === "tickets" ? <TicketsView /> : <TemplatesView />}
    </div>
  );
}

function TicketsView() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [stats, setStats] = useState<{ open_count: number; last7: number } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await supportAdminApi.listTickets({
        status: filterStatus !== "all" ? filterStatus : undefined,
        category: filterCategory !== "all" ? filterCategory : undefined,
        priority: filterPriority !== "all" ? filterPriority : undefined,
        q: search.trim() || undefined,
      });
      setTickets(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const s = await supportAdminApi.stats();
      setStats({ open_count: s.open_count, last7: s.last7 });
    } catch {
      /* skip */
    }
  };

  useEffect(() => {
    load();
    loadStats();
  }, [filterStatus, filterCategory, filterPriority]);

  if (selectedId) {
    return (
      <TicketDetailAdmin
        ticketId={selectedId}
        onBack={() => {
          setSelectedId(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Активных</div>
            <div className="text-2xl font-semibold">{stats?.open_count ?? "—"}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">За 7 дней</div>
            <div className="text-2xl font-semibold">{stats?.last7 ?? "—"}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm col-span-2 sm:col-span-2">
          <CardContent className="p-3 flex items-center gap-2">
            <Icon name="Search" size={14} className="text-muted-foreground" />
            <Input
              placeholder="Поиск по теме, email или имени"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load();
              }}
              className="border-0 shadow-none focus-visible:ring-0 h-8 px-0"
            />
            <Button size="sm" variant="outline" onClick={load}>
              Найти
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          {STATUS_LIST.map((s) => (
            <option key={s.value} value={s.value}>
              Статус: {s.label}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">Категория: все</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              Категория: {l}
            </option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">Приоритет: все</option>
          <option value="high">Приоритет: высокий</option>
          <option value="medium">Приоритет: средний</option>
          <option value="low">Приоритет: низкий</option>
        </select>
      </div>

      {loading && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <Icon name="Loader2" size={20} className="animate-spin mx-auto mb-2" />
          Загружаем тикеты…
        </div>
      )}

      {!loading && tickets.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Под выбранные фильтры обращений нет.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {tickets.map((t) => {
          const meta = STATUS_META[t.status];
          const prio = PRIORITY_META[t.priority];
          return (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className="w-full text-left rounded-xl border border-border bg-card p-3 sm:p-4 hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    #{t.id} · {t.subject}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t.name || "—"} · {t.email}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${meta.cls}`}>
                    {meta.label}
                  </span>
                  <span className={`text-[11px] ${prio.cls}`}>{prio.label}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span>{CATEGORY_LABELS[t.category] || t.category}</span>
                <span className="flex items-center gap-1">
                  <Icon name="MessageSquare" size={11} />
                  {t.msg_count}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="Clock" size={11} />
                  {formatDateTime(t.updated_at)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TicketDetailAdmin({
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
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <Icon name="ArrowLeft" size={16} />К списку
      </button>

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

function TemplatesView() {
  const [templates, setTemplates] = useState<SupportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<SupportTemplate> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await supportAdminApi.listTemplates();
      setTemplates(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim() || !editing.body?.trim()) {
      toast.error("Заполните заголовок и текст");
      return;
    }
    try {
      await supportAdminApi.saveTemplate(editing);
      toast.success("Шаблон сохранён");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  };

  const archive = async (id: number) => {
    if (!confirm("Скрыть этот шаблон? Он перестанет показываться при ответах.")) return;
    try {
      await supportAdminApi.archiveTemplate(id);
      toast.success("Шаблон скрыт");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось");
    }
  };

  if (editing) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {editing.id ? "Редактировать шаблон" : "Новый шаблон"}
            </h3>
            <button
              onClick={() => setEditing(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon name="X" size={18} />
            </button>
          </div>
          <div>
            <Label className="text-xs">Заголовок</Label>
            <Input
              value={editing.title || ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="Например: Приветствие"
            />
          </div>
          <div>
            <Label className="text-xs">Категория</Label>
            <select
              value={editing.category || "other"}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Текст шаблона</Label>
            <Textarea
              value={editing.body || ""}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              rows={6}
              placeholder="Текст ответа, который оператор сможет вставить одним кликом"
            />
          </div>
          <div>
            <Label className="text-xs">Порядок отображения</Label>
            <Input
              type="number"
              value={editing.sort_order || 0}
              onChange={(e) =>
                setEditing({ ...editing, sort_order: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1">
              <Icon name="Save" size={14} className="mr-1" />
              Сохранить
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Отмена
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Готовые ответы для быстрой работы операторов.
        </p>
        <Button
          size="sm"
          onClick={() =>
            setEditing({ title: "", body: "", category: "other", sort_order: 0 })
          }
        >
          <Icon name="Plus" size={14} className="mr-1" />
          Новый шаблон
        </Button>
      </div>

      {loading && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <Icon name="Loader2" size={20} className="animate-spin mx-auto mb-2" />
          Загружаем…
        </div>
      )}

      {!loading && templates.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Шаблонов нет. Создайте первый — он сразу появится при ответах.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {templates.map((t) => (
          <Card key={t.id} className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {t.body}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {CATEGORY_LABELS[t.category] || t.category} · порядок {t.sort_order}
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                    <Icon name="Pencil" size={13} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => archive(t.id)}
                  >
                    <Icon name="Archive" size={13} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}