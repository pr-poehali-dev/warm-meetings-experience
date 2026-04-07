import { useState, useEffect, useRef } from "react";
import { organizerApi, CoOrganizer, UserSearchResult } from "@/lib/organizer-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";

interface Props {
  eventId: number;
}

function Avatar({ name, photo }: { name: string; photo?: string | null }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-semibold text-muted-foreground">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function InviteByLink({ eventId, query }: { eventId: number; query: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/invite?invite_event=${eventId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      toast({ title: "Ссылка скопирована", description: "Отправьте её тому, кого хотите пригласить" });
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-3 space-y-2">
      <p className="text-xs text-muted-foreground">
        Пользователь <span className="font-medium text-foreground">«{query}»</span> не найден на сайте.
        Отправьте ему ссылку для регистрации — после входа он автоматически попадёт в эту встречу как соорганизатор.
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors w-full ${
          copied
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-background border-border hover:bg-muted text-foreground"
        }`}
      >
        <Icon name={copied ? "Check" : "Copy"} size={13} />
        {copied ? "Скопировано!" : "Скопировать ссылку-приглашение"}
      </button>
    </div>
  );
}

export default function CoOrganizersPanel({ eventId }: Props) {
  const { toast } = useToast();
  const [coOrganizers, setCoOrganizers] = useState<CoOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!eventId) return;
    organizerApi.getCoOrganizers(eventId)
      .then(setCoOrganizers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const data = await organizerApi.searchUsers(query.trim());
        const coIds = new Set(coOrganizers.map((c) => c.user_id));
        setResults(data.filter((u) => !coIds.has(u.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query, coOrganizers]);

  const handleAdd = async (user: UserSearchResult) => {
    setAdding(user.id);
    try {
      const added = await organizerApi.addCoOrganizer(eventId, user.id);
      setCoOrganizers((prev) => [...prev, { ...added, name: user.name, email: user.email, telegram: user.telegram, display_name: user.display_name, photo_url: user.photo_url }]);
      setQuery("");
      setResults([]);
      setShowSearch(false);
      toast({ title: `${user.name} добавлен как соорганизатор` });
    } catch {
      toast({ title: "Ошибка добавления", variant: "destructive" });
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (co: CoOrganizer) => {
    setRemoving(co.user_id);
    try {
      await organizerApi.removeCoOrganizer(eventId, co.user_id);
      setCoOrganizers((prev) => prev.filter((c) => c.user_id !== co.user_id));
      toast({ title: `${co.name} удалён из соорганизаторов` });
    } catch {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  };

  if (!eventId) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Сохраните встречу, чтобы добавить соорганизаторов
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* текущие соорганизаторы */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon name="Loader2" size={13} className="animate-spin" />
          Загрузка...
        </div>
      ) : coOrganizers.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Соорганизаторов пока нет</p>
      ) : (
        <div className="space-y-2">
          {coOrganizers.map((co) => (
            <div key={co.user_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={co.display_name || co.name} photo={co.photo_url} />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{co.display_name || co.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {co.telegram || co.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(co)}
                disabled={removing === co.user_id}
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Удалить"
              >
                {removing === co.user_id
                  ? <Icon name="Loader2" size={13} className="animate-spin" />
                  : <Icon name="X" size={13} />
                }
              </button>
            </div>
          ))}
        </div>
      )}

      {/* кнопка + поиск */}
      {!showSearch ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setShowSearch(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="gap-2 text-xs h-8"
        >
          <Icon name="UserPlus" size={13} />
          Добавить соорганизатора
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Имя, email или Telegram..."
              className="pl-8 h-9 text-sm"
            />
            {searching && (
              <Icon name="Loader2" size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* результаты поиска */}
          {results.length > 0 && (
            <div className="border rounded-lg bg-background shadow-sm overflow-hidden">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleAdd(user)}
                  disabled={adding === user.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left border-b last:border-b-0"
                >
                  <Avatar name={user.display_name || user.name} photo={user.photo_url} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      {user.display_name || user.name}
                      {user.is_organizer && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          Организатор
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user.telegram || user.email}
                    </div>
                  </div>
                  {adding === user.id
                    ? <Icon name="Loader2" size={14} className="animate-spin text-muted-foreground flex-shrink-0" />
                    : <Icon name="Plus" size={14} className="text-primary flex-shrink-0" />
                  }
                </button>
              ))}
            </div>
          )}

          {query.trim().length >= 2 && !searching && results.length === 0 && (
            <InviteByLink eventId={eventId} query={query} />
          )}

          <button
            type="button"
            onClick={() => { setShowSearch(false); setQuery(""); setResults([]); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Отмена
          </button>
        </div>
      )}
    </div>
  );
}