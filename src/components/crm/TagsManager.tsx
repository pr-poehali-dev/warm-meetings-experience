import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { crmApi, CrmTag } from "@/lib/crm-api";

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#6b7280",
];

export default function TagsManager() {
  const [tags, setTags] = useState<CrmTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await crmApi.listTags();
      setTags(r.tags || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await crmApi.createTag(name.trim(), color);
      setName("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить тег? Он исчезнет у всех клиентов.")) return;
    await crmApi.deleteTag(id);
    await load();
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-medium">Создать новый тег</div>
          <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: VIP, должник, новичок…"
              maxLength={64}
              className="flex-1 min-w-[180px]"
            />
            <div className="flex gap-1 items-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-1 ring-foreground scale-110" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Button type="submit" size="sm" disabled={!name.trim() || saving}>
              <Icon name="Plus" size={14} className="mr-1" /> Добавить
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          Тегов пока нет. Создайте первый — он появится в карточках клиентов.
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((t) => (
            <Card key={t.id} className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                <div className="flex-1 font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t.clients_count || 0} клиентов
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-destructive">
                  <Icon name="Trash2" size={14} />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
