import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import MastersToolbar from "./MastersToolbar";
import MasterCard, { AdminMaster } from "./MasterCard";
import MasterDetailSheet from "./MasterDetailSheet";

const MASTERS_API = "https://functions.poehali.dev/5e680421-cf43-4b07-abc1-8005b1b68de6";

function getAdminToken() {
  return localStorage.getItem("admin_token") || "";
}

type FilterType = "all" | "unverified" | "verified";

export default function AdminMasters() {
  const [masters, setMasters] = useState<AdminMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("unverified");
  const [processing, setProcessing] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminMaster | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (s = search, f = filter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ admin: "1" });
      if (s) params.set("search", s);
      if (f === "verified") params.set("verified", "true");
      if (f === "unverified") params.set("verified", "false");
      const res = await fetch(`${MASTERS_API}/?${params}`, {
        headers: { "X-Admin-Token": getAdminToken() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMasters(data.masters || []);
    } catch {
      toast.error("Не удалось загрузить мастеров");
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    load();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (master: AdminMaster) => {
    setSelected(master);
    setDetailLoading(true);
    try {
      if (master.is_active) {
        const res = await fetch(`${MASTERS_API}/?slug=${master.slug}`, {
          headers: { "X-Admin-Token": getAdminToken() },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.master) {
            setSelected({ ...master, ...data.master });
          }
        }
      }
    } catch {
      // Показываем то, что есть в списке
    } finally {
      setDetailLoading(false);
    }
  };

  const handleVerify = async (id: number, is_verified: boolean) => {
    setProcessing(id);
    try {
      const res = await fetch(`${MASTERS_API}/?admin_verify=1`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken() },
        body: JSON.stringify({ id, is_verified }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(is_verified ? "Мастер верифицирован" : "Верификация снята");
      if (selected?.id === id) setSelected((s) => s ? { ...s, is_verified } : s);
      load();
    } catch {
      toast.error("Ошибка при изменении статуса");
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleActive = async (id: number, is_active: boolean) => {
    setProcessing(id);
    try {
      const res = await fetch(`${MASTERS_API}/?admin_verify=1`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken() },
        body: JSON.stringify({ id, is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(is_active ? "Мастер активирован" : "Мастер скрыт");
      if (selected?.id === id) setSelected((s) => s ? { ...s, is_active } : s);
      load();
    } catch {
      toast.error("Ошибка");
    } finally {
      setProcessing(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search, filter);
  };

  const unverifiedCount = masters.filter((m) => !m.is_verified && m.is_active).length;

  return (
    <div className="space-y-6">
      <MastersToolbar
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        unverifiedCount={unverifiedCount}
        onSearch={handleSearch}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : masters.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {filter === "unverified" ? "Нет мастеров, ожидающих верификации" : "Мастера не найдены"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {masters.map((master) => (
            <MasterCard
              key={master.id}
              master={master}
              processing={processing}
              onOpen={openDetail}
              onVerify={handleVerify}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      <MasterDetailSheet
        selected={selected}
        detailLoading={detailLoading}
        processing={processing}
        onClose={() => setSelected(null)}
        onVerify={handleVerify}
        onToggleActive={handleToggleActive}
      />
    </div>
  );
}
