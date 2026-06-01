import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { masterChatApi, ChatMessage } from "@/lib/master-calendar-api";

interface ChatData {
  guest_name: string;
  master_name: string | null;
  service_name: string | null;
  status: string;
  datetime_start: string | null;
  messages: ChatMessage[];
}

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function fmtWhen(iso: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
    return `${d.getDate()} ${months[d.getMonth()]} в ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "";
  }
}

export default function MasterChat() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ChatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [kbOffset, setKbOffset] = useState(0);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const json = await masterChatApi.getPublic(token);
      setData(json as ChatData);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("404")) setError("Ссылка недействительна или устарела");
      else setError("Не удалось загрузить переписку");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [data?.messages.length]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      setKbOffset(diff > 80 ? diff : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const send = async () => {
    if (!token) return;
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await masterChatApi.sendPublic(token, body);
      setText("");
      await load();
    } catch (e) {
      toast.error("Не удалось отправить: " + String(e));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Icon name="AlertCircle" size={26} />
          </div>
          <h1 className="font-semibold text-lg">Ссылка недоступна</h1>
          <p className="text-sm text-muted-foreground">
            {error || "Откройте ссылку из подтверждения вашей записи."}
          </p>
        </div>
      </div>
    );
  }

  const when = fmtWhen(data.datetime_start);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col" style={{ maxHeight: "100vh" }}>
      <header className="bg-white border-b px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
            {(data.master_name || "М").slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{data.master_name || "Мастер"}</div>
            <div className="text-xs text-muted-foreground truncate">
              {data.service_name || "Запись"}{when ? ` · ${when}` : ""}
            </div>
          </div>
        </div>
      </header>

      <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-xs text-amber-800 shrink-0">
        <div className="max-w-2xl mx-auto flex items-start gap-2">
          <Icon name="Info" size={14} className="mt-0.5 shrink-0" />
          <div>Здравствуйте, {data.guest_name || "гость"}! Напишите мастеру — он увидит сообщение в своём кабинете.</div>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4">
        <div className="max-w-2xl mx-auto space-y-2">
          {data.messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-16">
              Здесь будет переписка с мастером
            </div>
          ) : (
            data.messages.map((m) => {
              const isGuest = m.direction === "in";
              return (
                <div key={m.id} className={`flex ${isGuest ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      isGuest
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-white border rounded-bl-md"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className={`text-[10px] mt-1 ${isGuest ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {fmtTime(m.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div
        className="border-t bg-white px-3 py-3 shrink-0"
        style={kbOffset > 0 ? { paddingBottom: `${12 + kbOffset}px` } : undefined}
      >
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Напишите сообщение…"
            rows={1}
            className="resize-none text-sm min-h-[40px] max-h-32"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button onClick={send} disabled={!text.trim() || sending} size="icon" className="shrink-0 h-10 w-10">
            {sending ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Send" size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
