/**
 * ЕДИНЫЙ КАНОН РАБОТЫ СО ВРЕМЕНЕМ В МОДУЛЕ БРОНИРОВАНИЯ МАСТЕРА.
 *
 * Правила (не нарушать — иначе вернётся баг рассинхрона времени):
 * 1. Бэкенд ВСЕГДА отдаёт datetime_start/datetime_end как ISO-строку
 *    с ЯВНЫМ offset таймзоны мастера, например "2026-06-04T18:00:00+03:00".
 * 2. Фронт ВСЕГДА показывает время в таймзоне мастера (не браузера).
 * 3. Фронт ВСЕГДА отправляет время с явным offset (никогда «голую» строку).
 *
 * Здесь нет копий этой логики в компонентах — только этот файл.
 */

/**
 * Извлекает «стенные» часы/минуты/дату из ISO-строки с offset, БЕЗ участия
 * таймзоны браузера. Т.е. для "2026-06-04T18:00:00+03:00" вернёт 18:00,
 * независимо от того, в какой зоне находится устройство пользователя.
 */
function parseWallParts(iso: string): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} {
  // Формат: YYYY-MM-DDTHH:MM[:SS][offset]
  const m = String(iso).match(
    /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
  );
  if (!m) {
    const d = new Date(iso);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hours: d.getHours(),
      minutes: d.getMinutes(),
    };
  }
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hours: Number(m[4]),
    minutes: Number(m[5]),
  };
}

/**
 * "HH:MM" из ISO-строки в зоне мастера (offset уже зашит бэкендом).
 * Заменяет старые копии parseLocalISO + format(..., "HH:mm").
 */
export function formatSlotTime(iso: string): string {
  const { hours, minutes } = parseWallParts(iso);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Возвращает { hours, minutes } из ISO-строки в зоне мастера. */
export function slotHoursMinutes(iso: string): { hours: number; minutes: number } {
  const { hours, minutes } = parseWallParts(iso);
  return { hours, minutes };
}

/**
 * Date-объект, чьи ЛОКАЛЬНЫЕ поля (getHours/getDate) равны «стенному»
 * времени мастера. Удобно для отображения и сравнения интервалов внутри
 * одной таймзоны (date-fns format, getHours и т.п.).
 * НЕ используйте .toISOString() на этом объекте для отправки — берите toServerISO.
 */
export function slotToWallDate(iso: string): Date {
  const p = parseWallParts(iso);
  return new Date(p.year, p.month - 1, p.day, p.hours, p.minutes, 0, 0);
}

/**
 * Смещение таймзоны в виде "+03:00" из IANA-имени ("Europe/Moscow") на
 * конкретную дату (учитывает переходы на летнее время там, где они есть).
 */
export function tzOffsetString(timezone: string, atDate: Date): string {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    });
    const part = dtf.formatToParts(atDate).find((p) => p.type === "timeZoneName");
    // longOffset даёт "GMT+03:00" → "+03:00"
    const raw = part?.value || "GMT+00:00";
    const m = raw.match(/GMT([+-]\d{2}:?\d{2})/);
    if (m) {
      const v = m[1].includes(":") ? m[1] : `${m[1].slice(0, 3)}:${m[1].slice(3)}`;
      return v;
    }
  } catch {
    /* fallthrough */
  }
  return "+03:00"; // безопасный дефолт — Москва
}

/**
 * Формирует ISO-строку с явным offset таймзоны мастера из «стенных» полей
 * Date (то, что пользователь видит на экране). Это то, что НУЖНО отправлять
 * на бэкенд вместо «голой» строки без зоны.
 *
 * @param wallDate Date, чьи локальные поля = время мастера на экране
 * @param timezone IANA-зона мастера (из CalendarSettings.timezone)
 */
export function toServerISO(wallDate: Date, timezone: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = wallDate.getFullYear();
  const mo = pad(wallDate.getMonth() + 1);
  const d = pad(wallDate.getDate());
  const h = pad(wallDate.getHours());
  const mi = pad(wallDate.getMinutes());
  const offset = tzOffsetString(timezone, wallDate);
  return `${y}-${mo}-${d}T${h}:${mi}:00${offset}`;
}

export const DEFAULT_MASTER_TZ = "Europe/Moscow";
