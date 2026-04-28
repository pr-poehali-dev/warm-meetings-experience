import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { OrgEvent } from "@/lib/organizer-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";

type StatusFilter = "all" | "active" | "past" | "drafts";

interface Props {
  events: OrgEvent[];
  loading: boolean;
  onCreateEvent: () => void;
  onEditEvent: (event: OrgEvent) => void;
  onManageParticipants: (event: OrgEvent) => void;
  onDuplicateEvent: (event: OrgEvent) => void;
  onToggleVisibility: (event: OrgEvent) => void;
  onDeleteEvent: (event: OrgEvent) => void;
  initialFilter?: StatusFilter;
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "Все",
  active: "Активные",
  past: "Прошедшие",
  drafts: "Черновики",
};

export default function OrgEventsList({
  events, loading, onCreateEvent, onEditEvent,
  onManageParticipants, onDuplicateEvent, onToggleVisibility, onDeleteEvent,
  initialFilter = "all",
}: Props) {
  const [filter, setFilter] = useState<StatusFilter>(initialFilter);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const handleShare = (ev: OrgEvent) => {
    const url = `${window.location.origin}/events/${ev.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Ссылка скопирована", description: url });
    });
  };

  const now = new Date().toISOString().split("T")[0];

  const filtered = events.filter((e) => {
    const matchesSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "active") return e.event_date >= now && e.is_visible;
    if (filter === "past") return e.event_date < now;
    if (filter === "drafts") return !e.is_visible;
    return true;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

  const occupancyBadge = (e: OrgEvent) => {
    const ratio = e.total_spots ? e.signups_count / e.total_spots : 0;
    if (ratio >= 1) return <Badge className="bg-red-100 text-red-700 text-xs">Полный</Badge>;
    if (ratio >= 0.7) return <Badge className="bg-orange-100 text-orange-700 text-xs">Почти полный</Badge>;
    return <Badge className="bg-green-100 text-green-700 text-xs">Есть места</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Мои события</h2>
        <Button onClick={onCreateEvent} className="gap-2">
          <Icon name="Plus" size={16} />
          Создать
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Loader2" size={28} className="animate-spin mx-auto mb-3" />
          <p className="text-sm">Загрузка...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Icon name="Calendar" size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Событий не найдено</p>
            {filter === "all" && !search && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onCreateEvent}>
                Создать первое событие
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ev) => (
            <Card key={ev.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                {ev.image_url ? (
                  <img src={ev.image_url} alt={ev.title} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-muted flex items-center justify-center">
                    <Icon name={ev.event_type_icon || "Calendar"} size={32} className="text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="sm" variant="secondary"
                    onClick={() => onEditEvent(ev)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700"
                    title="Редактировать"
                  >
                    <Icon name="Edit" size={16} />
                  </Button>
                  <Button
                    size="sm" variant="secondary"
                    onClick={() => onManageParticipants(ev)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700"
                    title={`Участники (${ev.signups_count})`}
                  >
                    <Icon name="Users" size={16} />
                  </Button>
                  <Button
                    size="sm" variant="secondary"
                    onClick={() => onDuplicateEvent(ev)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700"
                    title="Дублировать"
                  >
                    <Icon name="Copy" size={16} />
                  </Button>
                  <Button
                    size="sm" variant="secondary"
                    onClick={() => handleShare(ev)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700"
                    title="Поделиться"
                  >
                    <Icon name="Share2" size={16} />
                  </Button>
                  <Button
                    size="sm" variant="secondary"
                    onClick={() => onToggleVisibility(ev)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700"
                    title={ev.is_visible ? "Скрыть" : "Опубликовать"}
                  >
                    <Icon name={ev.is_visible ? "Eye" : "EyeOff"} size={16} />
                  </Button>
                  <Button
                    size="sm" variant="secondary"
                    onClick={() => onDeleteEvent(ev)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700 hover:text-red-600"
                    title="Удалить"
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
                {!ev.is_visible && (
                  <div className="absolute top-2 left-2">
                    <span className="text-xs bg-gray-800/80 text-white px-2 py-1 rounded">Скрыто</span>
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {ev.event_type && (
                    <div className="flex items-center gap-1.5 text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded">
                      <Icon name={ev.event_type_icon || "Users"} size={14} />
                      <span>{ev.event_type}</span>
                    </div>
                  )}
                  {ev.event_date >= now && ev.is_visible && occupancyBadge(ev)}
                </div>

                <h3 className="font-bold text-base text-foreground mb-1 line-clamp-2">{ev.title}</h3>

                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Icon name="Calendar" size={14} />
                    {formatDate(ev.event_date)}
                  </span>
                  {ev.start_time && (
                    <span className="flex items-center gap-1">
                      <Icon name="Clock" size={14} />
                      {ev.start_time.slice(0, 5)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {ev.price_amount > 0 && (
                      <span className="text-sm font-semibold">{ev.price_amount.toLocaleString("ru")} ₽</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {ev.signups_count}/{ev.total_spots || "∞"} мест
                  </span>
                </div>

                {ev.bath_name && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Icon name="MapPin" size={12} />
                    {ev.bath_name}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}