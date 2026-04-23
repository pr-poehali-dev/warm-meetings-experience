import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { signupsApi, SignupFromAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  confirmed: "Подтверждена",
  cancelled: "Отменена",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const AdminEventSignups = () => {
  const [signups, setSignups] = useState<SignupFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SignupFromAPI | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<SignupFromAPI>>({});
  const { toast } = useToast();

  const fetchSignups = async () => {
    try {
      const data = await signupsApi.getAll();
      setSignups(data);
    } catch {
      toast({ title: "Ошибка загрузки записей", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignups();
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await signupsApi.updateStatus(id, status);
      toast({ title: "Статус обновлён" });
      fetchSignups();
      if (selected?.id === id) setSelected((s) => (s ? { ...s, status } : s));
    } catch {
      toast({ title: "Ошибка обновления", variant: "destructive" });
    }
  };

  const openDialog = (signup: SignupFromAPI) => {
    setSelected(signup);
    setDraft({});
    setEditing(false);
  };

  const startEdit = () => {
    if (!selected) return;
    setDraft({
      name: selected.name,
      phone: selected.phone,
      telegram: selected.telegram,
      comment: selected.comment || "",
      status: selected.status,
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft({});
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await signupsApi.update(selected.id, draft);
      toast({ title: "Запись обновлена" });
      setSelected(updated);
      setEditing(false);
      setDraft({});
      fetchSignups();
    } catch {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="Loader2" size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Записи на событие
      </h1>

      {signups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Icon
              name="Inbox"
              size={48}
              className="text-gray-300 mx-auto mb-4"
            />
            <p className="text-gray-500">Записей пока нет</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {signups.map((signup) => (
            <Card
              key={signup.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openDialog(signup)}
            >
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{signup.name}</div>
                  <div className="text-sm text-gray-500">
                    {signup.phone}
                    {signup.telegram && ` · ${signup.telegram}`}
                  </div>
                  {signup.event_title && (
                    <div className="text-xs text-gray-400 mt-1">
                      {signup.event_title} · {signup.event_date}
                    </div>
                  )}
                  {signup.comment && (
                    <div className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                      <Icon name="MessageSquare" size={12} />
                      {signup.comment}
                    </div>
                  )}
                </div>
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[signup.status] || "bg-gray-100 text-gray-800"}`}
                  >
                    {STATUS_LABELS[signup.status] || signup.status}
                  </span>
                  <Select
                    value={signup.status}
                    onValueChange={(v) => handleStatusChange(signup.id, v)}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Новая</SelectItem>
                      <SelectItem value="confirmed">Подтверждена</SelectItem>
                      <SelectItem value="cancelled">Отменена</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setEditing(false);
            setDraft({});
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="User" size={18} />
              Запись #{selected?.id}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <Label>Имя</Label>
                      <Input
                        value={draft.name ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Телефон</Label>
                      <Input
                        value={draft.phone ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Telegram</Label>
                      <Input
                        value={draft.telegram ?? ""}
                        placeholder="@username"
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, telegram: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Статус</Label>
                      <Select
                        value={draft.status ?? selected.status}
                        onValueChange={(v) =>
                          setDraft((d) => ({ ...d, status: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Новая</SelectItem>
                          <SelectItem value="confirmed">
                            Подтверждена
                          </SelectItem>
                          <SelectItem value="cancelled">Отменена</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Комментарий администратора</Label>
                      <Textarea
                        value={draft.comment ?? ""}
                        rows={3}
                        placeholder="Заметки по заявке..."
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, comment: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
                    <span className="text-gray-500">Имя</span>
                    <span className="font-medium">{selected.name}</span>

                    <span className="text-gray-500">Телефон</span>
                    <a
                      href={`tel:${selected.phone}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {selected.phone}
                    </a>

                    {selected.email && (
                      <>
                        <span className="text-gray-500">Email</span>
                        <a
                          href={`mailto:${selected.email}`}
                          className="font-medium text-blue-600 hover:underline truncate"
                        >
                          {selected.email}
                        </a>
                      </>
                    )}

                    {selected.telegram && (
                      <>
                        <span className="text-gray-500">Telegram</span>
                        <a
                          href={`https://t.me/${selected.telegram.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {selected.telegram}
                        </a>
                      </>
                    )}

                    {selected.event_title && (
                      <>
                        <span className="text-gray-500">Событие</span>
                        <span>{selected.event_title}</span>
                      </>
                    )}

                    {selected.event_date && (
                      <>
                        <span className="text-gray-500">Дата</span>
                        <span>{selected.event_date}</span>
                      </>
                    )}

                    <span className="text-gray-500">Статус</span>
                    <span
                      className={`inline-flex w-fit text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status] || "bg-gray-100 text-gray-800"}`}
                    >
                      {STATUS_LABELS[selected.status] || selected.status}
                    </span>

                    <span className="text-gray-500">Создана</span>
                    <span>
                      {new Date(selected.created_at).toLocaleString("ru-RU")}
                    </span>

                    {selected.comment && (
                      <>
                        <span className="text-gray-500">Комментарий</span>
                        <span className="text-amber-700">
                          {selected.comment}
                        </span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Отмена
                </Button>
                <Button onClick={saveEdit} disabled={saving}>
                  {saving && (
                    <Icon
                      name="Loader2"
                      size={14}
                      className="animate-spin mr-1"
                    />
                  )}
                  Сохранить
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={startEdit}
                className="w-full sm:w-auto"
              >
                <Icon name="Pencil" size={14} className="mr-1.5" />
                Редактировать
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEventSignups;