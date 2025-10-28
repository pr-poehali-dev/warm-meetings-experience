import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const API_URL = "https://functions.poehali.dev/0c83af59-23b2-45d2-b91c-4948f162ee87";

interface CalendarBlock {
  id?: string;
  title: string;
  reason?: string;
  block_from: string;
  block_to: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

const AdminAvailability = () => {
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<CalendarBlock | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<CalendarBlock>({
    title: "",
    reason: "",
    block_from: "",
    block_to: "",
    notes: "",
  });

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=calendar-blocks`);
      const data = await response.json();
      setBlocks(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить блокировки",
        variant: "destructive",
      });
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = editingBlock ? "PUT" : "POST";
      const body = editingBlock
        ? { ...formData, id: editingBlock.id }
        : formData;

      const response = await fetch(`${API_URL}?resource=calendar-blocks`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save block");

      toast({
        title: "Успешно!",
        description: editingBlock ? "Блокировка обновлена" : "Блокировка создана",
      });

      setIsDialogOpen(false);
      setEditingBlock(null);
      setFormData({
        title: "",
        reason: "",
        block_from: "",
        block_to: "",
        notes: "",
      });
      fetchBlocks();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить блокировку",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (block: CalendarBlock) => {
    setEditingBlock(block);
    setFormData({
      title: block.title,
      reason: block.reason || "",
      block_from: block.block_from.slice(0, 16),
      block_to: block.block_to.slice(0, 16),
      notes: block.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить эту блокировку?")) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?resource=calendar-blocks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast({
        title: "Удалено",
        description: "Блокировка удалена",
      });

      fetchBlocks();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить блокировку",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openNewDialog = () => {
    setEditingBlock(null);
    setFormData({
      title: "",
      reason: "",
      block_from: "",
      block_to: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление занятостью</h1>
          <p className="text-gray-500 mt-1">Блокируйте даты когда вы не можете принимать гостей</p>
        </div>
        <Button onClick={openNewDialog} disabled={loading}>
          <Icon name="Plus" size={18} className="mr-2" />
          Добавить блокировку
        </Button>
      </div>

      {loading && blocks.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin text-nature-moss" />
        </div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Icon name="Calendar" size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">Нет блокировок</p>
          <Button onClick={openNewDialog}>Добавить первую блокировку</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{block.title}</h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Icon name="Calendar" size={16} />
                      <span>С {formatDateTime(block.block_from)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="Calendar" size={16} />
                      <span>По {formatDateTime(block.block_to)}</span>
                    </div>
                    
                    {block.reason && (
                      <div className="flex items-start gap-2 mt-3">
                        <Icon name="Info" size={16} className="mt-0.5" />
                        <span className="text-gray-700">{block.reason}</span>
                      </div>
                    )}
                    
                    {block.notes && (
                      <div className="flex items-start gap-2 mt-2">
                        <Icon name="FileText" size={16} className="mt-0.5" />
                        <span className="text-gray-500 italic">{block.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(block)}
                    disabled={loading}
                  >
                    <Icon name="Edit" size={16} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(block.id!)}
                    disabled={loading}
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? "Редактировать блокировку" : "Новая блокировка"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Название *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Например: Выходной"
                required
              />
            </div>

            <div>
              <Label htmlFor="reason">Причина</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Например: Личные дела"
              />
            </div>

            <div>
              <Label htmlFor="block_from">Начало блокировки *</Label>
              <Input
                id="block_from"
                type="datetime-local"
                value={formData.block_from}
                onChange={(e) => setFormData({ ...formData, block_from: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="block_to">Конец блокировки *</Label>
              <Input
                id="block_to"
                type="datetime-local"
                value={formData.block_to}
                onChange={(e) => setFormData({ ...formData, block_to: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Заметки</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Дополнительная информация..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAvailability;
