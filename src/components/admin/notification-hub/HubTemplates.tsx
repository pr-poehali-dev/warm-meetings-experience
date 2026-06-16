import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { hubApi, Template, ChannelBody } from "./hubApi";

const ALL_CHANNELS = ["telegram", "email", "vk"];
const CHANNEL_LABELS: Record<string, string> = {
  telegram: "Telegram",
  email: "Email",
  vk: "ВКонтакте",
};

export default function HubTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);

  const load = () => {
    setLoading(true);
    hubApi
      .listTemplates()
      .then((d) => setTemplates(d.templates))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleActive = async (t: Template) => {
    try {
      await hubApi.saveTemplate({ ...t, is_active: !t.is_active });
      setTemplates((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, is_active: !x.is_active } : x))
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-3">
      {templates.map((t) => (
        <Card key={t.id}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{t.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {t.event_type}
                </Badge>
                {!t.is_active && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    отключён
                  </Badge>
                )}
              </div>
              {t.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
              )}
              <div className="flex gap-1 mt-1.5">
                {Object.keys(t.bodies).map((ch) => (
                  <Badge key={ch} variant="outline" className="text-[10px]">
                    {CHANNEL_LABELS[ch] || ch}
                  </Badge>
                ))}
              </div>
            </div>
            <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
            <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
              <Icon name="Pencil" size={14} className="mr-1" />
              Изменить
            </Button>
          </CardContent>
        </Card>
      ))}

      {editing && (
        <TemplateEditor
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

function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: Template;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bodies, setBodies] = useState<Record<string, ChannelBody>>(
    () => JSON.parse(JSON.stringify(template.bodies || {}))
  );
  const [saving, setSaving] = useState(false);

  const setField = (ch: string, field: keyof ChannelBody, value: string) => {
    setBodies((prev) => ({ ...prev, [ch]: { ...prev[ch], [field]: value } }));
  };

  const toggleChannel = (ch: string, on: boolean) => {
    setBodies((prev) => {
      const next = { ...prev };
      if (on) next[ch] = next[ch] || (ch === "email" ? { subject: "", html: "" } : { text: "" });
      else delete next[ch];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await hubApi.saveTemplate({ ...template, bodies });
      toast.success("Шаблон сохранён");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
        </DialogHeader>

        {template.variables?.length > 0 && (
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-medium mb-1.5">Доступные переменные:</p>
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

        <div className="space-y-4">
          {ALL_CHANNELS.map((ch) => {
            const active = !!bodies[ch];
            return (
              <div key={ch} className="border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{CHANNEL_LABELS[ch]}</span>
                  <Switch
                    checked={active}
                    onCheckedChange={(on) => toggleChannel(ch, on)}
                  />
                </div>
                {active && (
                  <div className="space-y-2">
                    {ch === "email" && (
                      <input
                        className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Тема письма"
                        value={bodies[ch]?.subject || ""}
                        onChange={(e) => setField(ch, "subject", e.target.value)}
                      />
                    )}
                    <textarea
                      rows={ch === "email" ? 5 : 4}
                      className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono"
                      placeholder={ch === "email" ? "HTML письма" : "Текст сообщения"}
                      value={(ch === "email" ? bodies[ch]?.html : bodies[ch]?.text) || ""}
                      onChange={(e) =>
                        setField(ch, ch === "email" ? "html" : "text", e.target.value)
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Icon name="Loader2" size={15} className="animate-spin" />}
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
