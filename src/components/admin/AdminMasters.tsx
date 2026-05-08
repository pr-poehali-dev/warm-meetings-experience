import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import AuditLogPanel from "@/components/admin/AuditLogPanel";

const MASTERS_API = "https://functions.poehali.dev/5e680421-cf43-4b07-abc1-8005b1b68de6";

function getAdminToken() {
  return localStorage.getItem("admin_token") || "";
}

interface AdminMaster {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  bio: string;
  city: string;
  phone: string;
  telegram: string;
  instagram: string;
  avatar: string;
  rating: number;
  reviews_count: number;
  price_from: number;
  experience_years: number;
  specializations?: { id: number; name: string; slug: string }[];
  baths?: { id: number; name: string; city: string; address: string }[];
  photos?: string[];
  portfolio?: string[];
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

type FilterType = "all" | "unverified" | "verified";

const SPEC_ICONS: Record<string, string> = {
  parilshchik: "Flame",
  "venik-master": "Leaf",
  massazhist: "Hand",
  aromaterapeut: "Wind",
  instruktor: "BookOpen",
  "bar-master": "Coffee",
};

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
      // Пробуем загрузить полный профиль по slug (только для активных)
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => openDetail(master)}
                    >
                      <Icon name="Eye" size={13} className="mr-1" />
                      Открыть
                    </Button>
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

      {/* Sheet — полный профиль мастера */}
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  {selected.is_verified && (
                    <Icon name="ShieldCheck" size={18} className="text-green-600" />
                  )}
                  {selected.name}
                </SheetTitle>
              </SheetHeader>

              {detailLoading && (
                <div className="flex justify-center py-6">
                  <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
                </div>
              )}

              <div className="space-y-5">
                {/* Аватар + базовые данные */}
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-full bg-muted flex-shrink-0 overflow-hidden">
                    {selected.avatar ? (
                      <img src={selected.avatar} alt={selected.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon name="User" size={28} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1.5">
                      {selected.is_verified && (
                        <Badge className="bg-green-600 text-white text-xs">
                          <Icon name="ShieldCheck" size={11} className="mr-1" />Верифицирован
                        </Badge>
                      )}
                      {!selected.is_active && (
                        <Badge variant="secondary" className="text-xs">Скрыт</Badge>
                      )}
                    </div>
                    {selected.tagline && (
                      <p className="text-sm italic text-muted-foreground">«{selected.tagline}»</p>
                    )}
                    {selected.rating > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <Icon name="Star" size={14} className="text-amber-400" />
                        <span className="font-medium">{selected.rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({selected.reviews_count} отзывов)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Контакты */}
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm border-t pt-4">
                  {selected.city && (
                    <>
                      <span className="text-muted-foreground">Город</span>
                      <span>{selected.city}</span>
                    </>
                  )}
                  {selected.experience_years > 0 && (
                    <>
                      <span className="text-muted-foreground">Опыт</span>
                      <span>{selected.experience_years} лет</span>
                    </>
                  )}
                  {selected.price_from > 0 && (
                    <>
                      <span className="text-muted-foreground">Цена от</span>
                      <span>{selected.price_from.toLocaleString("ru")} ₽</span>
                    </>
                  )}
                  {selected.phone && (
                    <>
                      <span className="text-muted-foreground">Телефон</span>
                      <a href={`tel:${selected.phone}`} className="text-blue-600 hover:underline">
                        {selected.phone}
                      </a>
                    </>
                  )}
                  {selected.telegram && (
                    <>
                      <span className="text-muted-foreground">Telegram</span>
                      <a
                        href={`https://t.me/${selected.telegram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        @{selected.telegram.replace("@", "")}
                      </a>
                    </>
                  )}
                  {selected.instagram && (
                    <>
                      <span className="text-muted-foreground">Instagram</span>
                      <a
                        href={`https://instagram.com/${selected.instagram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        @{selected.instagram.replace("@", "")}
                      </a>
                    </>
                  )}
                  <span className="text-muted-foreground">Добавлен</span>
                  <span>{new Date(selected.created_at).toLocaleDateString("ru-RU")}</span>
                </div>

                {/* О себе */}
                {selected.bio && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">О себе</p>
                    <p className="text-sm whitespace-pre-line">{selected.bio}</p>
                  </div>
                )}

                {/* Специализации */}
                {selected.specializations && selected.specializations.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Специализации</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.specializations.map((s) => (
                        <Badge key={s.id} variant="secondary" className="text-xs flex items-center gap-1">
                          <Icon name={SPEC_ICONS[s.slug] || "Sparkles"} size={11} />
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Фото */}
                {selected.photos && selected.photos.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Фотографии
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {selected.photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt=""
                            className="w-full aspect-square object-cover rounded-lg hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Бани */}
                {selected.baths && selected.baths.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Работает в банях
                    </p>
                    <div className="space-y-1.5">
                      {selected.baths.map((b) => (
                        <div key={b.id} className="text-sm flex items-center gap-2">
                          <Icon name="Building2" size={13} className="text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">{b.name}</span>
                          {b.city && <span className="text-muted-foreground">· {b.city}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ссылка на публичный профиль */}
                {selected.is_active && (
                  <div className="border-t pt-4">
                    <a
                      href={`/masters/${selected.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                    >
                      <Icon name="ExternalLink" size={14} />
                      Публичный профиль
                    </a>
                  </div>
                )}

                {/* Кнопки верификации */}
                <div className="border-t pt-4 flex flex-wrap gap-2">
                  {!selected.is_verified ? (
                    <Button
                      onClick={() => handleVerify(selected.id, true)}
                      disabled={processing === selected.id}
                    >
                      {processing === selected.id ? (
                        <Icon name="Loader2" size={15} className="animate-spin mr-2" />
                      ) : (
                        <Icon name="ShieldCheck" size={15} className="mr-2" />
                      )}
                      Верифицировать
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => handleVerify(selected.id, false)}
                      disabled={processing === selected.id}
                    >
                      <Icon name="ShieldOff" size={15} className="mr-2" />
                      Снять верификацию
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleToggleActive(selected.id, !selected.is_active)}
                    disabled={processing === selected.id}
                  >
                    <Icon name={selected.is_active ? "EyeOff" : "Eye"} size={15} className="mr-2" />
                    {selected.is_active ? "Скрыть" : "Показать"}
                  </Button>
                </div>

                {/* История изменений */}
                <div className="border-t pt-4">
                  <AuditLogPanel entityType="master" entityId={selected.id} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
