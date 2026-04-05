import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { OrgEvent } from "@/lib/organizer-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}: Props) {
  const [filter, setFilter] = useState<StatusFilter>("all");
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
        <div className="space-y-3">
          {filtered.map((ev) => (
            <Card key={ev.id} className={`transition-all ${!ev.is_visible ? "opacity-70" : ""}`}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {ev.image_url && (
                    <img
                      src={ev.image_url}
                      alt={ev.title}
                      className="w-16 h-16 rounded-lg object-cover shrink-0 hidden sm:block"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{ev.title}</span>
                          {!ev.is_visible && <Badge variant="secondary" className="text-xs shrink-0">черновик</Badge>}
                          {ev.event_date >= now && ev.is_visible && occupancyBadge(ev)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Icon name="Calendar" size={12} />
                            {formatDate(ev.event_date)}
                          </span>
                          {ev.start_time && (
                            <span className="flex items-center gap-1">
                              <Icon name="Clock" size={12} />
                              {ev.start_time.slice(0, 5)}–{ev.end_time?.slice(0, 5)}
                            </span>
                          )}
                          {ev.bath_name && (
                            <span className="flex items-center gap-1 truncate">
                              <Icon name="MapPin" size={12} />
                              {ev.bath_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold">
                          {ev.signups_count}/{ev.total_spots || "∞"}
                        </div>
                        <div className="text-xs text-muted-foreground">участников</div>
                        {ev.price_amount > 0 && (
                          <div className="text-xs text-green-600 font-medium mt-0.5">
                            {(ev.signups_count * ev.price_amount).toLocaleString("ru")} ₽
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => onEditEvent(ev)} className="h-7 text-xs gap-1">
                        <Icon name="Pencil" size={12} />
                        Редактировать
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onManageParticipants(ev)} className="h-7 text-xs gap-1">
                        <Icon name="Users" size={12} />
                        Участники ({ev.signups_count})
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleShare(ev)} className="h-7 text-xs gap-1">
                        <Icon name="Share2" size={12} />
                        Поделиться
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDuplicateEvent(ev)} className="h-7 text-xs gap-1">
                        <Icon name="Copy" size={12} />
                        Копировать
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onToggleVisibility(ev)}
                        className="h-7 text-xs gap-1"
                      >
                        <Icon name={ev.is_visible ? "EyeOff" : "Eye"} size={12} />
                        {ev.is_visible ? "Скрыть" : "Опубликовать"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteEvent(ev)}
                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                      >
                        <Icon name="Trash2" size={12} />
                      </Button>
                    </div>
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