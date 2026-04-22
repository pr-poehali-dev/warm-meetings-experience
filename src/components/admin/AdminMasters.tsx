import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

const MASTERS_API = "https://functions.poehali.dev/5e680421-cf43-4b07-abc1-8005b1b68de6";

function getAdminToken() {
  return localStorage.getItem("admin_token") || "";
}

interface AdminMaster {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  city: string;
  phone: string;
  telegram: string;
  avatar: string;
  rating: number;
  reviews_count: number;
  price_from: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

type FilterType = "all" | "unverified" | "verified";

export default function AdminMasters() {
  const [masters, setMasters] = useState<AdminMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("unverified");
  const [processing, setProcessing] = useState<number | null>(null);

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Мастера</h2>
          {filter === "unverified" && unverifiedCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {unverifiedCount} ожидают верификации
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <Input
            placeholder="Поиск по имени, городу, телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="outline" size="icon">
            <Icon name="Search" size={16} />
          </Button>
        </form>
        <div className="flex gap-1.5">
          {(["unverified", "all", "verified"] as FilterType[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f === "unverified" ? "На проверке" : f === "verified" ? "Верифицированные" : "Все"}
            </Button>
          ))}
        </div>
      </div>

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
            <Card key={master.id} className={!master.is_active ? "opacity-60" : ""}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0 overflow-hidden">
                    {master.avatar ? (
                      <img src={master.avatar} alt={master.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon name="User" size={20} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{master.name}</span>
                      {master.is_verified && (
                        <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600">
                          <Icon name="ShieldCheck" size={11} className="mr-1" />
                          Верифицирован
                        </Badge>
                      )}
                      {!master.is_active && (
                        <Badge variant="secondary" className="text-xs">Скрыт</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {master.city && <span>{master.city}</span>}
                      {master.phone && <span>{master.phone}</span>}
                      {master.telegram && <span>@{master.telegram.replace("@", "")}</span>}
                      {master.price_from > 0 && <span>от {master.price_from.toLocaleString("ru")} ₽</span>}
                      {master.rating > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Icon name="Star" size={11} className="text-amber-400" />
                          {master.rating.toFixed(1)} ({master.reviews_count})
                        </span>
                      )}
                    </div>
                    {master.tagline && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{master.tagline}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Добавлен: {new Date(master.created_at).toLocaleDateString("ru-RU")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {!master.is_verified ? (
                      <Button
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => handleVerify(master.id, true)}
                        disabled={processing === master.id}
                      >
                        {processing === master.id ? (
                          <Icon name="Loader2" size={13} className="animate-spin mr-1" />
                        ) : (
                          <Icon name="ShieldCheck" size={13} className="mr-1" />
                        )}
                        Верифицировать
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 text-muted-foreground"
                        onClick={() => handleVerify(master.id, false)}
                        disabled={processing === master.id}
                      >
                        <Icon name="ShieldOff" size={13} className="mr-1" />
                        Снять
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 text-muted-foreground"
                      onClick={() => handleToggleActive(master.id, !master.is_active)}
                      disabled={processing === master.id}
                    >
                      <Icon name={master.is_active ? "EyeOff" : "Eye"} size={13} className="mr-1" />
                      {master.is_active ? "Скрыть" : "Показать"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
