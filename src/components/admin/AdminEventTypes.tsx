import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEventTypes, createEventType, updateEventType, deleteEventType, EventType } from "@/hooks/useEventTypes";

const ICON_OPTIONS = ["Users", "Heart", "GraduationCap", "Coffee", "PartyPopper", "Dumbbell", "Sparkles", "Star", "Flame", "Zap", "Music", "Leaf", "Sun", "Moon", "Wind", "Droplets", "Shield", "Award", "Gift", "Camera", "Circle", "Briefcase", "Globe", "Laugh", "Handshake"];

export default function AdminEventTypes() {
  const { types, loading, reload } = useEventTypes();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [form, setForm] = useState({ value: '', label: '', icon: 'Circle', sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ value: '', label: '', icon: 'Circle', sort_order: types.length });
    setDialogOpen(true);
  };

  const openEdit = (t: EventType) => {
    setEditing(t);
    setForm({ value: t.value, label: t.label, icon: t.icon, sort_order: t.sort_order });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateEventType(editing.id, { label: form.label, icon: form.icon, sort_order: form.sort_order }, '');
        toast({ title: 'Тип обновлён' });
      } else {
        if (!form.value.trim()) {
          toast({ title: 'Укажите значение (value)', variant: 'destructive' });
          setSaving(false);
          return;
        }
        await createEventType({ value: form.value.trim(), label: form.label.trim(), icon: form.icon, sort_order: form.sort_order }, '');
        toast({ title: 'Тип добавлен' });
      }
      setDialogOpen(false);
      reload();
    } catch {
      toast({ title: 'Ошибка', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: EventType) => {
    if (!confirm(`Удалить тип «${t.label}»?`)) return;
    try {
      await deleteEventType(t.id, '');
      toast({ title: 'Тип удалён' });
      reload();
    } catch {
      toast({ title: 'Ошибка при удалении', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Типы мероприятий</h2>
          <p className="text-muted-foreground text-sm mt-1">Список типов, доступных при создании события</p>
        </div>
        <Button onClick={openCreate}>
          <Icon name="Plus" size={16} className="mr-2" />
          Добавить тип
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Загрузка...</div>
      ) : (
        <div className="border rounded-lg divide-y">
          {types.map((t) => (
            <div key={t.id} className="flex items-center gap-4 px-4 py-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted">
                <Icon name={t.icon} size={16} fallback="Circle" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{t.label}</div>
                <div className="text-xs text-muted-foreground">значение: {t.value} · порядок: {t.sort_order}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                  <Icon name="Pencil" size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(t)} className="text-destructive hover:text-destructive">
                  <Icon name="Trash2" size={14} />
                </Button>
              </div>
            </div>
          ))}
          {types.length === 0 && (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">Нет типов мероприятий</div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Редактировать тип' : 'Новый тип мероприятия'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editing && (
              <div>
                <Label>Значение (латиница/кириллица, уникальное) *</Label>
                <Input
                  placeholder="например: нетворкинг"
                  value={form.value}
                  onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))}
                  maxLength={100}
                />
              </div>
            )}
            <div>
              <Label>Название *</Label>
              <Input
                placeholder="например: Нетворкинг"
                value={form.label}
                onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))}
                maxLength={100}
              />
            </div>
            <div>
              <Label>Иконка</Label>
              <div className="grid grid-cols-8 gap-1.5 mt-2">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    title={icon}
                    onClick={() => setForm(f => ({ ...f, icon }))}
                    className={`flex items-center justify-center w-9 h-9 rounded border-2 transition-colors ${form.icon === icon ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}
                  >
                    <Icon name={icon} size={18} fallback="Circle" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Порядок сортировки</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}