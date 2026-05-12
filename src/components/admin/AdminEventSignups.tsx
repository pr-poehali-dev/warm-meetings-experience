import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { signupsApi, SignupFromAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useStickyFilters } from "@/hooks/useStickyFilters";
import { auditLog } from "@/lib/audit-log";
import SignupFilters from "./signups/SignupFilters";
import SignupCard from "./signups/SignupCard";
import SignupSheet from "./signups/SignupSheet";
import { FilterTab } from "./signups/signupTypes";

const AdminEventSignups = () => {
  const [signups, setSignups] = useState<SignupFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SignupFromAPI | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<SignupFromAPI>>({});
  const { filters, setFilter } = useStickyFilters("signups", { status: "new" });
  const filterStatus = filters.status;
  const setFilterStatus = (v: string) => setFilter("status", v);
  const { toast } = useToast();

  const filteredSignups =
    filterStatus === "all"
      ? signups
      : signups.filter((s) => s.status === filterStatus);

  const counts = {
    new: signups.filter((s) => s.status === "new").length,
    confirmed: signups.filter((s) => s.status === "confirmed").length,
    cancelled: signups.filter((s) => s.status === "cancelled").length,
    all: signups.length,
  };

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
      const prev = signups.find((s) => s.id === id);
      await signupsApi.updateStatus(id, status);
      auditLog.record({
        entity_type: "signup",
        entity_id: id,
        action: "status_change",
        field: "status",
        old_value: prev?.status ?? null,
        new_value: status,
      });
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
      auditLog.record({
        entity_type: "signup",
        entity_id: selected.id,
        action: "edit",
        comment: "Изменены данные записи",
      });
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

  const closeSheet = () => {
    setSelected(null);
    setEditing(false);
    setDraft({});
  };

  const handleDraftChange = (patch: Partial<SignupFromAPI>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="Loader2" size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const filterTabs: FilterTab[] = [
    { value: "new", label: "Новые", count: counts.new },
    { value: "confirmed", label: "Подтверждены", count: counts.confirmed },
    { value: "cancelled", label: "Отменены", count: counts.cancelled },
    { value: "all", label: "Все", count: counts.all },
  ];

  return (
    <div>
      <SignupFilters
        tabs={filterTabs}
        activeFilter={filterStatus}
        onFilterChange={setFilterStatus}
      />

      {filteredSignups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Icon name="Inbox" size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Записей пока нет</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSignups.map((signup) => (
            <SignupCard
              key={signup.id}
              signup={signup}
              onOpen={openDialog}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      <SignupSheet
        selected={selected}
        editing={editing}
        saving={saving}
        draft={draft}
        onClose={closeSheet}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onSaveEdit={saveEdit}
        onDraftChange={handleDraftChange}
      />
    </div>
  );
};

export default AdminEventSignups;
