import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { supportAdminApi, SupportTemplate } from "@/lib/support-api";
import { toast } from "sonner";
import { CATEGORY_LABELS } from "./SupportConstants";

export default function TemplatesView() {
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
