import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import {
  NotifyScenario, NotifyRecipient, NotifyChannel,
  CHANNEL_LABELS, CHANNEL_ICONS, TEMPLATE_VARS,
  notifyApi, SendResult,
} from "@/lib/notify-api";

interface Props {
  scenario: NotifyScenario | null;
  eventId: number | null;
  onClose: () => void;
  onSent: (result: SendResult) => void;
}

export default function SendPanel({ scenario, eventId, onClose, onSent }: Props) {
  const [recipients, setRecipients] = useState<NotifyRecipient[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [channel, setChannel] = useState<NotifyChannel>("email");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (scenario) {
      setSubject(scenario.subject || "");
      setBodyHtml(scenario.body_html || "");
      if (scenario.channels?.length) setChannel(scenario.channels[0]);
    }
  }, [scenario]);

  useEffect(() => {
    if (!eventId) return;
    setLoadingRec(true);
    notifyApi.getRecipients(eventId)
      .then(({ recipients: r }) => {
        setRecipients(r);
        setSelected(new Set(r.map((rc) => rc.id)));
      })
      .catch(() => {})
      .finally(() => setLoadingRec(false));
  }, [eventId]);

  const filtered = filterStatus === "all"
    ? recipients
    : recipients.filter((r) => r.status === filterStatus);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };

  const toggleOne = (id: number) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };

  const insertVar = (v: string) => setBodyHtml((b) => b + v);

  const validRecipients = filtered.filter((r) => selected.has(r.id) && (
    channel === "email" ? !!r.email :
    channel === "telegram" ? !!r.tg_username :
    !!r.user_id
  ));

  const handleSend = async () => {
    if (!subject.trim() || !bodyHtml.trim()) return;
    setSending(true);
    try {
      const result = await notifyApi.send({
        event_id: eventId ?? undefined,
        signup_ids: Array.from(selected),
        scenario_id: scenario?.id,
        channel,
        subject,
        body_html: bodyHtml,
      });
      onSent(result);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  };

  const statuses = [...new Set(recipients.map((r) => r.status))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            {scenario ? `Отправить: ${scenario.name}` : "Быстрая отправка"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Выберите получателей и канал</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-2">
          <Icon name="X" size={16} />
        </Button>
      </div>

      {/* Канал */}
      <div className="space-y-1.5">
        <Label className="text-xs">Канал отправки</Label>
        <div className="flex gap-2">
          {(["email", "telegram", "vk"] as NotifyChannel[]).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${channel === ch ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
            >
              <Icon name={CHANNEL_ICONS[ch] as "Mail"} size={12} />
              {CHANNEL_LABELS[ch]}
            </button>
          ))}
        </div>
      </div>

      {/* Получатели */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            Получатели
            {eventId && !loadingRec && (
              <span className="ml-2 text-muted-foreground">({recipients.length} участников)</span>
            )}
          </Label>
          {statuses.length > 1 && (
            <div className="flex gap-1">
              {["all", ...statuses].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${filterStatus === st ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {st === "all" ? "все" : st}
                </button>
              ))}
            </div>
          )}
        </div>

        {!eventId ? (
          <div className="text-center py-6 border-2 border-dashed rounded-xl">
            <p className="text-sm text-muted-foreground">Выберите событие для загрузки участников</p>
          </div>
        ) : loadingRec ? (
          <div className="flex items-center justify-center py-6">
            <Icon name="Loader2" size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed rounded-xl">
            <p className="text-sm text-muted-foreground">Нет участников</p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
              <button onClick={toggleAll} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selected.size === filtered.length ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                  {selected.size === filtered.length && <Icon name="Check" size={10} className="text-white" />}
                </div>
                {selected.size === filtered.length ? "Снять всё" : `Выбрать всех (${filtered.length})`}
              </button>
              <span className="ml-auto text-[10px] text-muted-foreground">
                Выбрано: {selected.size} · Получат: {validRecipients.length}
              </span>
            </div>
            <div className="max-h-44 overflow-y-auto divide-y">
              {filtered.map((r) => {
                const hasContact = channel === "email" ? !!r.email :
                  channel === "telegram" ? !!r.tg_username : !!r.user_id;
                return (
                  <div key={r.id}
                    onClick={() => toggleOne(r.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${selected.has(r.id) ? "bg-primary/4" : "hover:bg-muted/30"} ${!hasContact ? "opacity-40" : ""}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selected.has(r.id) ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                      {selected.has(r.id) && <Icon name="Check" size={10} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {channel === "email" ? (r.email || "нет email") :
                         channel === "telegram" ? (r.tg_username ? `@${r.tg_username}` : "не привязан") :
                         r.user_id ? "привязан" : "не привязан"}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">{r.status}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Тема */}
      <div className="space-y-1.5">
        <Label className="text-xs">Тема письма</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Тема письма"
          className="h-9 text-sm"
        />
      </div>

      {/* Переменные */}
      <div className="flex gap-1 flex-wrap">
        {TEMPLATE_VARS.slice(0, 4).map((v) => (
          <button key={v.key} onClick={() => insertVar(v.key)}
            title={v.label}
            className="px-2 py-0.5 bg-muted hover:bg-muted/70 rounded text-[11px] font-mono text-primary">
            {v.key}
          </button>
        ))}
      </div>

      {/* Текст */}
      <div className="space-y-1.5">
        <Label className="text-xs">Текст письма</Label>
        <textarea
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          placeholder="<p>Здравствуйте, {{name}}!</p>"
          className="w-full min-h-[120px] rounded-xl border bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button
          onClick={handleSend}
          disabled={sending || validRecipients.length === 0 || !subject.trim() || !bodyHtml.trim()}
          className="flex-1 gap-2"
        >
          {sending
            ? <><Icon name="Loader2" size={15} className="animate-spin" /> Отправляю...</>
            : <><Icon name="Send" size={15} /> Отправить {validRecipients.length > 0 ? `(${validRecipients.length})` : ""}</>
          }
        </Button>
        <Button variant="outline" onClick={onClose} disabled={sending}>Отмена</Button>
      </div>
    </div>
  );
}
