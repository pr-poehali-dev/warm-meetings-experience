import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { crmApi, CrmClientCard, CrmTag } from "@/lib/crm-api";
import GuestChatDialog from "./GuestChatDialog";

interface ClientCardProps {
  clientKey: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function ClientCard({ clientKey, onClose, onChanged }: ClientCardProps) {
  const [data, setData] = useState<CrmClientCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [allTags, setAllTags] = useState<CrmTag[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [chatSignupId, setChatSignupId] = useState<number | null>(null);

  const lastSignupId = useMemo(() => {
    const items = data?.history || [];
    for (const h of items) {
      if (h.kind === "event" && typeof h.signup_id === "number") return h.signup_id;
    }
    return null;
  }, [data]);

  const load = async () => {
    if (!clientKey) return;
    setLoading(true);
    try {
      const [card, tags] = await Promise.all([
        crmApi.getClient(clientKey),
        crmApi.listTags(),
      ]);
      setData(card);
      setAllTags(tags.tags || []);
    } catch (e) {
      console.error("CRM getClient failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientKey) load();
    else setData(null);
  }, [clientKey]);

  const handleAddNote = async () => {
    if (!clientKey || !newNote.trim()) return;
    setSavingNote(true);
    try {
      await crmApi.createNote(clientKey, newNote.trim());
      setNewNote("");
      await load();
      onChanged?.();
    } finally {
      setSavingNote(false);
    }
  };

  const toggleTag = async (tag: CrmTag) => {
    if (!clientKey) return;
    const active = data?.tags.some((t) => t.id === tag.id);
    await crmApi.toggleClientTag(clientKey, tag.id, active ? "remove" : "add");
    await load();
    onChanged?.();
  };

  if (!clientKey) return null;

  const client = data?.client;
  const open = !!clientKey;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="User" size={18} />
            Карточка гостя
          </DialogTitle>
        </DialogHeader>

        {loading || !data ? (
          <div className="flex justify-center py-12">
            <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Шапка */}
            <Card className="border-0 shadow-sm bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-lg truncate">{client?.name || "Без имени"}</div>
                    <div className="space-y-1 text-sm mt-2">
                      {client?.phone && (
                        <div className="flex items-center gap-2">
                          <Icon name="Phone" size={13} className="text-muted-foreground" />
                          <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
                        </div>
                      )}
                      {client?.email && (
                        <div className="flex items-center gap-2">
                          <Icon name="Mail" size={13} className="text-muted-foreground" />
                          <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
                        </div>
                      )}
                      {client?.telegram && (
                        <div className="flex items-center gap-2">
                          <Icon name="Send" size={13} className="text-muted-foreground" />
                          <span>{client.telegram}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => lastSignupId && setChatSignupId(lastSignupId)}
                    disabled={!lastSignupId}
                    title={lastSignupId ? "Открыть диалог" : "Нет записей гостя — диалог недоступен"}
                  >
                    <Icon name="MessageSquare" size={14} />
                    Написать
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Финансы */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Визитов</div>
                  <div className="font-bold text-lg">{data.stats.visits_count}</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Записей</div>
                  <div className="font-bold text-lg">{data.stats.total_bookings}</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Потратил</div>
                  <div className="font-bold text-lg">{formatMoney(data.stats.total_spent)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Теги */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Tags" size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium">Теги</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allTags.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Сначала создайте теги на вкладке «Теги»</span>
                ) : (
                  allTags.map((t) => {
                    const active = data.tags.some((dt) => dt.id === t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTag(t)}
                        className={`px-2 py-1 rounded-full text-xs border transition-all ${
                          active ? "text-white" : "text-muted-foreground bg-background"
                        }`}
                        style={{
                          backgroundColor: active ? t.color : undefined,
                          borderColor: t.color,
                        }}
                      >
                        {t.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* История */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Icon name="History" size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium">История записей ({data.history.length})</span>
              </div>
              {data.history.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2">Пока нет записей</div>
              ) : (
                <div className="space-y-1.5">
                  {data.history.map((h, i) => {
                    const icon = h.kind === "master" ? "Flame" : h.kind === "ritual" ? "Sparkles" : "CalendarDays";
                    const iconColor = h.kind === "master" ? "text-orange-500" : h.kind === "ritual" ? "text-violet-500" : "text-emerald-500";
                    return (
                      <Card key={i} className="border-0 shadow-sm">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0`}>
                            <Icon name={icon} size={14} className={iconColor} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{h.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(h.date)} {h.bath_name && `• ${h.bath_name}`}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant="outline" className="text-[10px]">{h.status}</Badge>
                            {h.amount > 0 && <div className="text-xs mt-0.5">{formatMoney(h.amount)}</div>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Заметки */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Icon name="StickyNote" size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium">Заметки (видно только вам)</span>
              </div>
              <div className="space-y-2">
                {data.notes.map((n) => (
                  <Card key={n.id} className="border-0 shadow-sm bg-amber-50/50">
                    <CardContent className="p-3">
                      <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{formatDate(n.created_at)}</div>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex gap-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Например: любит берёзовый веник, предпочитает утром…"
                    rows={2}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || savingNote}>
                    <Icon name="Plus" size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      <GuestChatDialog
        open={chatSignupId !== null}
        signupId={chatSignupId}
        guestName={client?.name || ""}
        guestPhone={client?.phone || null}
        guestEmail={client?.email || null}
        guestTelegram={client?.telegram || null}
        onClose={() => {
          setChatSignupId(null);
          load();
        }}
      />
    </Dialog>
  );
}