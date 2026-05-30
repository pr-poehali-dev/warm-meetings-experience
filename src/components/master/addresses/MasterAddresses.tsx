import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { masterCalendarApi } from "@/lib/master-calendar-api";
import type { AddressType, MasterAddress } from "@/lib/master-calendar-api";
import AddressDialog, { AddressFormData } from "./AddressDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TYPE_LABEL: Record<AddressType, string> = {
  home: "Дом",
  studio: "Студия",
  partner: "Партнёрская баня",
  other: "Другое",
};

const MasterAddresses = ({ masterId }: { masterId: number }) => {
  const [addresses, setAddresses] = useState<MasterAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MasterAddress | null>(null);
  const [deleting, setDeleting] = useState<MasterAddress | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterId]);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const data = await masterCalendarApi.getAddresses(masterId);
      setAddresses(data);
    } catch {
      toast({ title: "Ошибка", description: "Не удалось загрузить адреса", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (addr: MasterAddress) => {
    setEditing(addr);
    setDialogOpen(true);
  };

  const handleSave = async (data: AddressFormData) => {
    setSaving(true);
    try {
      if (editing?.id) {
        await masterCalendarApi.updateAddress({
          id: editing.id,
          master_id: masterId,
          address_text: data.address_text.trim(),
          address_type: data.address_type,
          latitude: data.latitude,
          longitude: data.longitude,
        });
        toast({ title: "Готово", description: "Адрес обновлён" });
      } else {
        await masterCalendarApi.createAddress({
          master_id: masterId,
          address_text: data.address_text.trim(),
          address_type: data.address_type,
          latitude: data.latitude,
          longitude: data.longitude,
          is_primary: addresses.length === 0,
        });
        toast({ title: "Готово", description: "Адрес добавлен" });
      }
      setDialogOpenSafe();
      await fetchAddresses();
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось сохранить адрес",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const setDialogOpenSafe = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSetPrimary = async (addr: MasterAddress) => {
    if (!addr.id || addr.is_primary) return;
    try {
      await masterCalendarApi.setPrimaryAddress(addr.id, masterId);
      await fetchAddresses();
    } catch {
      toast({ title: "Ошибка", description: "Не удалось назначить основным", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleting?.id) return;
    setDeletingBusy(true);
    try {
      await masterCalendarApi.deleteAddress(deleting.id, masterId);
      toast({ title: "Готово", description: "Адрес удалён" });
      setDeleting(null);
      await fetchAddresses();
    } catch (e) {
      toast({
        title: "Нельзя удалить",
        description:
          e instanceof Error && /использ|in_use/i.test(e.message)
            ? "Адрес привязан к расписанию или слотам. Сначала отвяжите его."
            : "Не удалось удалить адрес",
        variant: "destructive",
      });
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  const primary = addresses.find((a) => a.is_primary);
  const others = addresses.filter((a) => !a.is_primary);

  const renderCard = (addr: MasterAddress) => (
    <div
      key={addr.id}
      className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
    >
      <Icon
        name={addr.is_primary ? "Star" : "MapPin"}
        size={18}
        className={addr.is_primary ? "text-amber-500 mt-0.5" : "text-muted-foreground mt-0.5"}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{addr.address_text}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {TYPE_LABEL[addr.address_type]}
          </span>
          {addr.is_primary && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Основной
            </span>
          )}
        </div>
        {addr.latitude != null && addr.longitude != null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Координаты: {Number(addr.latitude).toFixed(5)}, {Number(addr.longitude).toFixed(5)}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {!addr.is_primary && (
            <button
              type="button"
              onClick={() => handleSetPrimary(addr)}
              className="text-xs text-nature-forest hover:underline font-medium"
            >
              Сделать основным
            </button>
          )}
          <button
            type="button"
            onClick={() => openEdit(addr)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <Icon name="Pencil" size={12} /> Изменить
          </button>
          <button
            type="button"
            onClick={() => setDeleting(addr)}
            className="text-xs text-red-500 hover:text-red-600 inline-flex items-center gap-1"
          >
            <Icon name="Trash2" size={12} /> Удалить
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Мои адреса</h3>
          <p className="text-xs text-muted-foreground">
            Где вы принимаете гостей. Основной адрес обязателен для работы.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Icon name="Plus" size={15} /> Добавить адрес
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
          <Icon name="MapPin" size={26} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Пока нет ни одного адреса. Добавьте основной адрес, чтобы привязывать его к дням работы.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {primary && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Основной адрес
              </p>
              {renderCard(primary)}
            </div>
          )}
          {others.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Дополнительные адреса
              </p>
              {others.map(renderCard)}
            </div>
          )}
        </div>
      )}

      <AddressDialog
        open={dialogOpen}
        onOpenChange={(v) => (v ? setDialogOpen(true) : setDialogOpenSafe())}
        editing={editing}
        saving={saving}
        onSave={handleSave}
      />

      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить адрес?</DialogTitle>
            <DialogDescription>
              {deleting
                ? `«${deleting.address_text}» будет удалён. Это действие нельзя отменить.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletingBusy}>
              {deletingBusy ? "Удаление…" : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterAddresses;