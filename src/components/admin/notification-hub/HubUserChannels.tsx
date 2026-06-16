import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { hubApi, UserChannelRow } from "./hubApi";

const CHANNELS: ("telegram" | "email" | "vk")[] = ["telegram", "email", "vk"];
const CHANNEL_META: Record<string, { label: string; icon: string; color: string }> = {
  telegram: { label: "Telegram", icon: "Send", color: "text-sky-500" },
  email: { label: "Email", icon: "Mail", color: "text-blue-500" },
  vk: { label: "ВКонтакте", icon: "MessageCircle", color: "text-indigo-500" },
};
const ROLE_LABEL: Record<string, string> = {
  master: "Мастер",
  parmaster: "Мастер",
  organizer: "Организатор",
  partner: "Управляющий",
  bath_owner: "Управляющий",
  admin: "Админ",
};

export default function HubUserChannels() {
  const [rows, setRows] = useState<UserChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [role, setRole] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("per_page", "30");
    if (role !== "all") p.set("role", role);
    if (search) p.set("search", search);
    hubApi
      .userChannels(`&${p.toString()}`)
      .then((d) => {
        setRows(d.users);
        setPages(d.pages || 1);
      })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, [page, role, search]);

  useEffect(load, [load]);

  const toggle = async (u: UserChannelRow, ch: "telegram" | "email" | "vk", active: boolean) => {
    setRows((prev) =>
      prev.map((x) =>
        x.id === u.id
          ? { ...x, channels: { ...x.channels, [ch]: { ...x.channels[ch], active } } }
          : x
      )
    );
    try {
      await hubApi.setUserChannel(u.id, ch, active);
      if (!active) toast.success(`${CHANNEL_META[ch].label} отключён для ${u.name}`);
    } catch (e) {
      toast.error((e as Error).message);
      load();
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Каналы уведомлений пользователей. Можно отключить канал конкретному пользователю
        (например, при жалобах на спам).
      </p>

      <div className="flex flex-wrap gap-2">
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Роль" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            <SelectItem value="master">Мастера</SelectItem>
            <SelectItem value="organizer">Организаторы</SelectItem>
            <SelectItem value="partner">Управляющие</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 flex-1 min-w-48">
          <Input
            placeholder="Поиск по имени / email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
          />
          <Button onClick={() => { setSearch(searchInput); setPage(1); }}>
            <Icon name="Search" size={16} />
          </Button>
          <Button variant="outline" onClick={load} title="Обновить">
            <Icon name="RefreshCw" size={16} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Никого не найдено</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{u.name || `ID ${u.id}`}</span>
                    {u.roles
                      .filter((r) => ROLE_LABEL[r])
                      .filter((r, i, a) => a.indexOf(r) === i)
                      .map((r) => (
                        <Badge key={r} variant="secondary" className="text-[10px]">
                          {ROLE_LABEL[r]}
                        </Badge>
                      ))}
                    {u.quiet_enabled && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <Icon name="Moon" size={10} /> тихие часы
                      </Badge>
                    )}
                  </div>
                  {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                </div>
                <div className="flex gap-4">
                  {CHANNELS.map((ch) => {
                    const st = u.channels[ch];
                    const meta = CHANNEL_META[ch];
                    return (
                      <div key={ch} className="flex flex-col items-center gap-1 w-16">
                        <Icon
                          name={meta.icon}
                          size={15}
                          className={st.connected ? meta.color : "text-muted-foreground/30"}
                        />
                        <Switch
                          checked={st.active && st.connected}
                          disabled={!st.connected}
                          onCheckedChange={(v) => toggle(u, ch, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Назад
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Вперёд
          </Button>
        </div>
      )}
    </div>
  );
}
