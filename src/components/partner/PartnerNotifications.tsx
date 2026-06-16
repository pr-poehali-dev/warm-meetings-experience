import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import {
  partnerApi,
  NotifyTemplate,
  NotifyChannelBody,
} from "@/lib/partner-api";

const CHANNELS = ["telegram", "email", "vk"];
const CHANNEL_LABELS: Record<string, string> = {
  telegram: "Telegram",
  email: "Email",
  vk: "ВКонтакте",
};

export default function PartnerNotifications() {
  const [templates, setTemplates] = useState<NotifyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NotifyTemplate | null>(null);

  const load = () => {
    setLoading(true);
    partnerApi
      .listNotifyTemplates()
      .then((d) => setTemplates(d.templates))
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Тексты уведомлений</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Настройте, как будут выглядеть сообщения вашим гостям и вам. Если не
          менять — используется стандартный текст платформы.
        </p>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Пока нет настраиваемых уведомлений
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Card key={t.event_type}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Icon name="Bell" size={18} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{t.name}</span>
                    {t.customized && (
                      <Badge className="text-[10px] bg-violet-100 text-violet-700 hover:bg-violet-100">
                        свой текст
                      </Badge>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.description}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                  <Icon name="Pencil" size={14} className="mr-1" />
                  Изменить
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <NotifyEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function NotifyEditor({
  template,
  onClose,
  onSaved,
}: {
  template: NotifyTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Начальное состояние: персональные тексты или копия общих
  const base = template.owner_bodies || template.global_bodies || {};
  const [bodies, setBodies] = useState<Record<string, NotifyChannelBody>>(
    () => JSON.parse(JSON.stringify(base))
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const setField = (ch: string, field: keyof NotifyChannelBody, value: string) => {
    setBodies((prev) => ({ ...prev, [ch]: { ...prev[ch], [field]: value } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await partnerApi.saveNotifyTemplate(template.event_type, bodies);
      toast.success("Текст сохранён");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      await partnerApi.resetNotifyTemplate(template.event_type);
      toast.success("Возвращён стандартный текст");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setResetting(false);
    }
  };

  const channelsWithBody = CHANNELS.filter(
    (ch) => template.global_bodies?.[ch] || template.owner_bodies?.[ch]
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-background w-full sm:max-w-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <div className="sticky top-0 bg-background border-b border-border px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold">{template.name}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {template.variables?.length > 0 && (
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs font-medium mb-1.5">
                Доступные подстановки (вставьте в текст):
              </p>
              <div className="flex flex-wrap gap-1">
                {template.variables.map((v) => (
                  <code
                    key={v}
                    className="text-[11px] bg-background border border-border rounded px-1.5 py-0.5"
                  >
                    {`{${v}}`}
                  </code>
                ))}
              </div>
            </div>
          )}

          {channelsWithBody.map((ch) => (
            <div key={ch} className="border border-border rounded-xl p-3">
              <div className="text-sm font-semibold mb-2">{CHANNEL_LABELS[ch]}</div>
              {ch === "email" && (
                <input
                  className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 mb-2"
                  placeholder="Тема письма"
                  value={bodies[ch]?.subject || ""}
                  onChange={(e) => setField(ch, "subject", e.target.value)}
                />
              )}
              <textarea
                rows={ch === "email" ? 5 : 4}
                className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                placeholder={ch === "email" ? "Текст письма" : "Текст сообщения"}
                value={(ch === "email" ? bodies[ch]?.html : bodies[ch]?.text) || ""}
                onChange={(e) =>
                  setField(ch, ch === "email" ? "html" : "text", e.target.value)
                }
              />
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-background border-t border-border px-5 py-3 flex items-center justify-between gap-2">
          {template.customized ? (
            <Button variant="ghost" onClick={reset} disabled={resetting} className="text-muted-foreground gap-1.5">
              {resetting && <Icon name="Loader2" size={14} className="animate-spin" />}
              Сбросить к стандартному
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving && <Icon name="Loader2" size={14} className="animate-spin" />}
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
