import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { masterBookingsApi, MyBooking } from "@/lib/master-calendar-api";

const STATUS_META: Record<string, { label: string; cls: string; icon: string }> = {
  pending:   { label: "Ожидает подтверждения", cls: "bg-amber-100 text-amber-700",   icon: "Clock" },
  confirmed: { label: "Подтверждена",          cls: "bg-emerald-100 text-emerald-700", icon: "CheckCircle2" },
  completed: { label: "Завершена",             cls: "bg-blue-100 text-blue-700",     icon: "Check" },
  canceled:  { label: "Отменена",              cls: "bg-rose-100 text-rose-600",     icon: "X" },
  no_show:   { label: "Не состоялась",         cls: "bg-stone-100 text-stone-500",   icon: "UserX" },
};

function fmtPrice(n: number) {
  return n.toLocaleString("ru-RU") + " ₽";
}

/** «Стенное» время мастера из ISO с offset — показываем как есть. */
function fmtDateTime(iso: string): string {
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return iso;
  const [, y, mo, d, hh, mm] = m;
  const months = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
  return `${Number(d)} ${months[Number(mo) - 1]} ${y}, ${hh}:${mm}`;
}

function mapUrl(b: MyBooking): string {
  if (b.meeting_latitude != null && b.meeting_longitude != null) {
    return `https://yandex.ru/maps/?pt=${b.meeting_longitude},${b.meeting_latitude}&z=17&l=map`;
  }
  return `https://yandex.ru/maps/?text=${encodeURIComponent(b.meeting_address || "")}`;
}

function isUpcoming(b: MyBooking): boolean {
  if (b.status === "canceled" || b.status === "completed" || b.status === "no_show") return false;
  return new Date(b.datetime_start.replace(" ", "T")).getTime() > Date.now() - 3 * 3600 * 1000;
}

export default function MyMasterBookings() {
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  useEffect(() => {
    masterBookingsApi
      .getMyBookings()
      .then((r) => setBookings(r.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: number) => {
    setCancelingId(id);
    try {
      await masterBookingsApi.cancelMyBooking(id);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "canceled" } : b)),
      );
      setConfirmId(null);
    } catch {
      /* пусть кнопка просто разблокируется */
    } finally {
      setCancelingId(null);
    }
  };

  const upcoming = bookings.filter(isUpcoming);
  const past = bookings.filter((b) => !isUpcoming(b));

  const renderCard = (b: MyBooking) => {
    const st = STATUS_META[b.status] || STATUS_META.pending;
    const canCancel = b.status === "pending" || b.status === "confirmed";
    return (
      <div key={b.id} className="p-3 rounded-xl border hover:bg-accent/5 transition-colors">
        <div className="flex gap-3">
          {b.master_avatar ? (
            <img src={b.master_avatar} alt={b.master_name || ""}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Icon name="User" size={20} className="text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-snug truncate">
                  {b.service_name || "Сеанс"}
                </h3>
                {b.master_name && (
                  <p className="text-xs text-muted-foreground truncate">{b.master_name}</p>
                )}
              </div>
              <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${st.cls}`}>
                <Icon name={st.icon as "Clock"} size={11} />
                {st.label}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Icon name="Calendar" size={12} />
                {fmtDateTime(b.datetime_start)}
              </span>
              {b.price > 0 && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  {fmtPrice(b.price)}
                </span>
              )}
            </div>

            {b.meeting_address && (
              <a href={mapUrl(b)} target="_blank" rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Icon name="MapPin" size={12} />
                <span className="truncate max-w-[220px]">{b.meeting_address}</span>
              </a>
            )}

            <div className="mt-2.5 flex flex-wrap gap-2">
              {b.reply_token && (
                <Link to={`/m/${b.reply_token}`}>
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <Icon name="MessageCircle" size={13} className="mr-1" />
                    Написать мастеру
                  </Button>
                </Link>
              )}
              {b.master_slug && (
                <Link to={`/masters/${b.master_slug}`}>
                  <Button size="sm" variant="ghost" className="h-8 text-xs">
                    Профиль мастера
                  </Button>
                </Link>
              )}
              {canCancel && confirmId !== b.id && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => setConfirmId(b.id)}
                >
                  <Icon name="X" size={13} className="mr-1" />
                  Отменить
                </Button>
              )}
            </div>

            {canCancel && confirmId === b.id && (
              <div className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50 p-2.5">
                <p className="text-xs text-rose-700 mb-2">Отменить эту запись? Мастер получит уведомление.</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                    disabled={cancelingId === b.id}
                    onClick={() => handleCancel(b.id)}
                  >
                    {cancelingId === b.id ? (
                      <Icon name="Loader2" size={13} className="mr-1 animate-spin" />
                    ) : null}
                    Да, отменить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={cancelingId === b.id}
                    onClick={() => setConfirmId(null)}
                  >
                    Назад
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Icon name="Sparkles" size={16} className="text-primary" />
          Записи к мастерам
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-6">
            <Icon name="CalendarHeart" size={36} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">У вас пока нет записей к мастерам</p>
            <Link to="/masters">
              <Button variant="outline" size="sm" className="mt-3">
                Найти мастера
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.length > 0 && (
              <div className="space-y-2">
                {upcoming.map(renderCard)}
              </div>
            )}
            {past.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">
                  История
                </div>
                {past.map(renderCard)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}