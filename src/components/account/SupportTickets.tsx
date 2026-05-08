import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { supportApi, Ticket, TicketStatus, TicketPriority } from "@/lib/support-api";
import { toast } from "sonner";

const STATUS_META: Record<TicketStatus, { label: string; cls: string }> = {
  open: { label: "Открыт", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  in_progress: { label: "В работе", cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  awaiting_reply: { label: "Ждём вас", cls: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" },
  closed: { label: "Закрыт", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300" },
};

const CATEGORIES = [
  { value: "booking", label: "Проблема с бронированием" },
  { value: "payment", label: "Вопрос по оплате" },
  { value: "tech", label: "Техническая проблема" },
  { value: "idea", label: "Предложение" },
  { value: "other", label: "Другое" },
];

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
];

function formatDate(s: string) {
  try {
    const d = new Date(s);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export default function SupportTickets({
  selectedId,
  onSelect,
}: {
  selectedId?: number | null;
  onSelect?: (id: number | null) => void;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await supportApi.listMyTickets();
      setTickets(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить обращения");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (creating) {
    return (
      <NewTicketForm
        onCancel={() => setCreating(false)}
        onCreated={(t) => {
          setCreating(false);
          setTickets((prev) => [t, ...prev]);
          onSelect?.(t.id);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Мои обращения</h2>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Icon name="Plus" size={14} className="mr-1" />
          Новое
        </Button>
      </div>

      {loading && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <Icon name="Loader2" size={20} className="animate-spin mx-auto mb-2" />
          Загружаем переписку…
        </div>
      )}

      {!loading && tickets.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-2">🪵</div>
            <h3 className="font-medium mb-1">Пока пусто</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Здесь появятся ваши обращения в поддержку. Если что-то нужно — пишите, мы рядом.
            </p>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Icon name="Plus" size={14} className="mr-1" />
              Написать в поддержку
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading &&
        tickets.map((t) => {
          const meta = STATUS_META[t.status];
          const isActive = selectedId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelect?.(t.id)}
              className={`w-full text-left rounded-xl border bg-card transition-colors p-3 sm:p-4 ${
                isActive ? "border-primary shadow-sm" : "border-border hover:border-foreground/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-sm font-medium flex-1 min-w-0 truncate">
                  {t.subject}
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${meta.cls}`}>
                  {meta.label}
                </span>
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span>#{t.id}</span>
                <span className="flex items-center gap-1">
                  <Icon name="Clock" size={11} />
                  {formatDate(t.updated_at)}
                </span>
              </div>
            </button>
          );
        })}

      {!loading && tickets.length > 0 && (
        <p className="text-[11px] text-muted-foreground pt-1">
          Не нашли свой вопрос?{" "}
          <Link to="/account?tab=support&new=1" className="underline">
            Напишите новое обращение
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function NewTicketForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (t: Ticket) => void;
}) {
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Заполните тему и сообщение");
      return;
    }
    setSending(true);
    try {
      const t = await supportApi.createTicket({
        name: "",
        email: "",
        subject: subject.trim(),
        category,
        message: message.trim(),
        priority,
        captcha_ok: true,
      });
      toast.success("Обращение создано");
      onCreated(t);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="ArrowLeft" size={18} />
        </button>
        <h2 className="text-lg font-semibold">Новое обращение</h2>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Категория</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Приоритет</Label>
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 text-xs py-2 rounded-md border transition-colors ${
                    priority === p.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Тема</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Кратко: о чём обращение"
              maxLength={120}
            />
          </div>

          <div>
            <Label className="text-xs">Сообщение</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Опишите ситуацию подробно — что происходит и какой ожидаете результат"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={submit} disabled={sending} className="flex-1">
              {sending ? (
                <>
                  <Icon name="Loader2" size={14} className="mr-1.5 animate-spin" />
                  Отправляем…
                </>
              ) : (
                <>
                  <Icon name="Send" size={14} className="mr-1.5" />
                  Отправить
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
