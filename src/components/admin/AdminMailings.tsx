import { useState, useEffect, useCallback } from "react";
import { useConfirm } from "@/hooks/useConfirm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import func2url from "../../../backend/func2url.json";

const API = (func2url as Record<string, string>)["admin-users"];

function getAdminToken(): string {
  return localStorage.getItem("admin_token") || "";
}

interface Audience {
  slug: string;
  label: string;
  total: number;
  email: number;
  telegram: number;
  vk: number;
}

interface FoundUser {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  has_tg: boolean;
  has_vk: boolean;
  has_email: boolean;
}

interface SendResult {
  recipients: number;
  sent: number;
  failed: number;
  skipped: number;
  by_channel: Record<string, { sent: number; failed: number; skipped: number }>;
  personal?: boolean;
}

const CHANNELS = [
  { key: "email", label: "Email", icon: "Mail" },
  { key: "telegram", label: "Telegram", icon: "Send" },
  { key: "vk", label: "VK", icon: "MessageCircle" },
];

export default function AdminMailings() {
  const [showConfirm, ConfirmDialog] = useConfirm();
  const [mode, setMode] = useState<"broadcast" | "personal">("broadcast");
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [audience, setAudience] = useState<string>("");
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  const [search, setSearch] = useState("");
  const [found, setFound] = useState<FoundUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<FoundUser[]>([]);

  const loadAudiences = useCallback(async () => {
    try {
      const res = await fetch(`${API}?resource=audiences`, {
        headers: { "X-Admin-Token": getAdminToken() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
      setAudiences(data.audiences || []);
      if (data.audiences?.length && !audience) {
        setAudience(data.audiences[0].slug);
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [audience]);

  useEffect(() => {
    loadAudiences();
  }, [loadAudiences]);

  const toggleChannel = (key: string) => {
    setChannels((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setFound([]);
      return;
    }
    try {
      const res = await fetch(`${API}?resource=user_search&q=${encodeURIComponent(q)}`, {
        headers: { "X-Admin-Token": getAdminToken() },
      });
      const data = await res.json();
      if (res.ok) setFound(data.users || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 350);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  const addUser = (u: FoundUser) => {
    if (!selectedUsers.find((s) => s.id === u.id)) {
      setSelectedUsers((prev) => [...prev, u]);
    }
    setSearch("");
    setFound([]);
  };

  const removeUser = (id: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const selectedAudience = audiences.find((a) => a.slug === audience);

  const estimate = () => {
    if (mode === "personal") return selectedUsers.length;
    if (!selectedAudience) return 0;
    const counts: Record<string, number> = {
      email: selectedAudience.email,
      telegram: selectedAudience.telegram,
      vk: selectedAudience.vk,
    };
    return Math.max(...channels.map((c) => counts[c] || 0), 0);
  };

  const send = async () => {
    if (!message.trim()) {
      toast.error("Введите текст сообщения");
      return;
    }
    if (channels.length === 0) {
      toast.error("Выберите хотя бы один канал");
      return;
    }
    if (mode === "personal" && selectedUsers.length === 0) {
      toast.error("Выберите получателей");
      return;
    }
    const confirmText =
      mode === "broadcast"
        ? `Отправить сообщение группе «${selectedAudience?.label}»?`
        : `Отправить сообщение ${selectedUsers.length} получателям?`;
    if (!(await showConfirm({ title: "Отправить рассылку?", description: confirmText, confirmLabel: "Отправить" }))) return;

    setSending(true);
    setResult(null);
    try {
      const payload: Record<string, unknown> = {
        channels,
        subject,
        message,
      };
      if (mode === "broadcast") {
        payload.audience = audience;
      } else {
        payload.user_ids = selectedUsers.map((u) => u.id);
      }
      const res = await fetch(`${API}?resource=broadcast`, {
        method: "POST",
        headers: {
          "X-Admin-Token": getAdminToken(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка отправки");
      setResult(data);
      toast.success(`Отправлено: ${data.sent}, пропущено: ${data.skipped}, ошибок: ${data.failed}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {ConfirmDialog}
      <div className="flex items-center gap-3">
        <Icon name="Megaphone" size={28} className="text-amber-600" />
        <div>
          <h1 className="text-2xl font-bold">Рассылки</h1>
          <p className="text-sm text-gray-500">Сообщения пользователям по email, Telegram и VK</p>
        </div>
      </div>

      {/* Режим */}
      <div className="flex gap-2">
        <Button
          variant={mode === "broadcast" ? "default" : "outline"}
          onClick={() => { setMode("broadcast"); setResult(null); }}
        >
          <Icon name="Users" size={16} className="mr-2" /> Массовая рассылка
        </Button>
        <Button
          variant={mode === "personal" ? "default" : "outline"}
          onClick={() => { setMode("personal"); setResult(null); }}
        >
          <Icon name="User" size={16} className="mr-2" /> Личное сообщение
        </Button>
      </div>

      {/* Аудитория */}
      {mode === "broadcast" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Кому отправить</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {audiences.map((a) => (
              <button
                key={a.slug}
                onClick={() => setAudience(a.slug)}
                className={`text-left p-3 rounded-lg border transition ${
                  audience === a.slug
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-sm">{a.label}</div>
                <div className="text-xs text-gray-500 mt-1">{a.total} чел.</div>
                <div className="flex gap-1 mt-1 text-[10px] text-gray-400">
                  <span>✉{a.email}</span>
                  <span>TG{a.telegram}</span>
                  <span>VK{a.vk}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Получатели</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Поиск по имени, email или телефону"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {found.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-auto">
                  {found.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => addUser(u)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium">{u.name || "Без имени"}</div>
                        <div className="text-xs text-gray-500">{u.email || u.phone || "—"}</div>
                      </div>
                      <div className="flex gap-1 text-[10px] text-gray-400">
                        {u.has_email && <span>✉</span>}
                        {u.has_tg && <span>TG</span>}
                        {u.has_vk && <span>VK</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <Badge key={u.id} variant="secondary" className="flex items-center gap-1">
                    {u.name || u.email || u.id}
                    <button onClick={() => removeUser(u.id)} className="ml-1">
                      <Icon name="X" size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Каналы */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Каналы доставки</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {CHANNELS.map((ch) => (
            <label key={ch.key} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={channels.includes(ch.key)}
                onCheckedChange={() => toggleChannel(ch.key)}
              />
              <Icon name={ch.icon} size={16} />
              <span className="text-sm">{ch.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Текст */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Сообщение</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-gray-500">Тема (для email)</Label>
            <Input
              placeholder="Например: Новости Sparcom"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Текст сообщения</Label>
            <Textarea
              placeholder="Текст, который получат пользователи..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Отправка */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-gray-500">
          Примерно получателей: <b>{estimate()}</b>
        </div>
        <Button onClick={send} disabled={sending} size="lg">
          {sending ? (
            <><Icon name="Loader2" size={18} className="mr-2 animate-spin" /> Отправляем...</>
          ) : (
            <><Icon name="Send" size={18} className="mr-2" /> Отправить</>
          )}
        </Button>
      </div>

      {/* Результат */}
      {result && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="font-medium mb-2">Готово</div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>Получателей: <b>{result.recipients}</b></span>
              <span className="text-emerald-700">Отправлено: <b>{result.sent}</b></span>
              <span className="text-gray-500">Пропущено: <b>{result.skipped}</b></span>
              <span className="text-rose-600">Ошибок: <b>{result.failed}</b></span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              «Пропущено» — у получателя нет данных для выбранного канала (например, не подключён Telegram).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}