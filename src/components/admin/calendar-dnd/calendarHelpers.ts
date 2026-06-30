import { EventInput } from "@fullcalendar/core";
import { MasterBooking, MasterSlot, DayBlock } from "@/lib/master-calendar-api";

export type FcbEvent = EventInput & {
  extendedProps: {
    kind: "booking" | "block" | "break" | "available" | "canceled";
    raw?: MasterBooking | MasterSlot | DayBlock;
    buffer?: number;
    note?: string;
    addrLabel?: string;
  };
};

export const fmtTime = (d: Date, tz: string) =>
  d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: tz });

export const fmtDate = (d: Date, tz: string) =>
  d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", timeZone: tz });

export const TZ_LABELS: Record<string, string> = {
  "Europe/Kaliningrad": "Калининград",
  "Europe/Moscow": "Москва",
  "Europe/Samara": "Самара",
  "Asia/Yekaterinburg": "Екатеринбург",
  "Asia/Omsk": "Омск",
  "Asia/Novosibirsk": "Новосибирск",
  "Asia/Krasnoyarsk": "Красноярск",
  "Asia/Irkutsk": "Иркутск",
  "Asia/Yakutsk": "Якутск",
  "Asia/Vladivostok": "Владивосток",
  "Asia/Magadan": "Магадан",
  "Asia/Kamchatka": "Камчатка",
};

export const tzLabel = (tz: string) => {
  const city = TZ_LABELS[tz] || tz;
  let off = "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    off = parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    off = "";
  }
  return off ? `${city} (${off.replace("GMT", "UTC")})` : city;
};