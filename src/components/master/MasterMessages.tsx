import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { masterChatApi, ChatDialog } from "@/lib/master-calendar-api";
import MasterBookingChat from "@/components/admin/bookings/MasterBookingChat";

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

const MasterMessages = ({ masterId }: { masterId: number }) => {
  const [dialogs, setDialogs] = useState<ChatDialog[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ChatDialog | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await masterChatApi.getDialogs(masterId);
      setDialogs(r.dialogs || []);
    } catch {
      setDialogs([]);
    } finally {
      setLoading(false);
    }
  }, [masterId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Сообщения</h2>
      <p className="text-sm text-muted-foreground -mt-2">
        Переписка с гостями: по записям и вопросам с вашей страницы.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : dialogs.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Icon name="MessageCircle" size={24} className="text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-1">Пока нет сообщений</h3>
          <p className="text-sm text-muted-foreground">
            Здесь появятся переписки с гостями, когда они напишут вам.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {dialogs.map((d) => (
            <button
              key={`${d.source}-${d.id}`}
              onClick={() => setActive(d)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
            >
              <div className="relative w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                {(d.client_name || "?").slice(0, 1).toUpperCase()}
                {d.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {d.unread_count}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{d.client_name || "Гость"}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{fmtWhen(d.last_at)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                      d.source === "inquiry"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {d.source === "inquiry" ? "Вопрос" : "Запись"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {d.last_direction === "out" ? "Вы: " : ""}
                    {d.last_body || d.service_name || ""}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <MasterBookingChat
        open={!!active}
        masterId={masterId}
        bookingId={active?.id ?? null}
        guestName={active?.client_name || "Гость"}
        source={active?.source ?? "booking"}
        onClose={() => {
          setActive(null);
          load();
        }}
      />
    </div>
  );
};

export default MasterMessages;
