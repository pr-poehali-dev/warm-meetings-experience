import FUNC_URLS from "../../backend/func2url.json";

const MASTERS_URL = FUNC_URLS["masters-api"];
const CALENDAR_URL = `${MASTERS_URL}?resource=calendar`;
const BOOKINGS_URL = `${MASTERS_URL}?resource=bookings`;

export type ServiceFormat = "on_site" | "at_home" | "by_agreement";

export interface MasterService {
  id?: number;
  master_id: number;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  max_clients: number;
  is_active: boolean;
  sort_order?: number;
  service_format?: ServiceFormat;
  departure_address_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type AddressType = "home" | "studio" | "partner" | "other";

export interface MasterAddress {
  id?: number;
  master_id: number;
  address_text: string;
  latitude?: number | null;
  longitude?: number | null;
  is_primary: boolean;
  address_type: AddressType;
  created_at?: string;
  updated_at?: string;
}

export interface MasterSlot {
  id?: number;
  master_id: number;
  service_id?: number | null;
  datetime_start: string;
  datetime_end: string;
  max_clients: number;
  booked_count: number;
  status: "available" | "pending" | "booked" | "blocked" | "event";
  source?: string;
  notes?: string;
  service_name?: string;
  duration_minutes?: number;
  service_price?: number;
  address_id?: number | null;
  slot_address?: string | null;
  slot_latitude?: number | null;
  slot_longitude?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateRule {
  id?: number;
  day_of_week: number;
  time_start: string;
  time_end: string;
  service_id?: number | null;
  max_clients: number;
  is_day_off: boolean;
  address_id?: number | null;
}

export interface ScheduleTemplate {
  id?: number;
  master_id: number;
  name: string;
  is_active: boolean;
  rules?: TemplateRule[];
  created_at?: string;
  updated_at?: string;
}

export interface CalendarSettings {
  master_id: number;
  default_slot_duration: number;
  break_between_slots: number;
  prep_time: number;
  max_clients_per_day: number;
  auto_confirm: boolean;
  notify_new_booking: boolean;
  notify_24h_reminder: boolean;
  notify_cancellation: boolean;
  timezone: string;
}

export interface DayBlock {
  id?: number;
  master_id: number;
  block_date: string;
  block_end_date?: string;
  reason?: string;
  notes?: string;
  created_at?: string;
}

export interface MasterBooking {
  id?: number;
  slot_id?: number;
  master_id: number;
  client_id?: number;
  client_name: string;
  client_phone: string;
  client_email?: string;
  service_id?: number;
  datetime_start: string;
  datetime_end: string;
  price: number;
  status: "pending" | "confirmed" | "canceled" | "completed" | "no_show";
  source?: string;
  event_id?: number;
  comment?: string;
  cancel_reason?: string;
  service_name?: string;
  duration_minutes?: number;
  meeting_address?: string | null;
  meeting_latitude?: number | null;
  meeting_longitude?: number | null;
  created_at?: string;
  updated_at?: string;
  confirmed_at?: string;
  canceled_at?: string;
  completed_at?: string;
}

export interface WeekViewData {
  week_start: string;
  week_end: string;
  slots: MasterSlot[];
  bookings: MasterBooking[];
  blocks: DayBlock[];
}

export interface BookingStats {
  completed_sessions: number;
  upcoming_sessions: number;
  canceled_sessions: number;
  no_show_sessions: number;
  total_sessions: number;
  total_revenue: number;
  expected_revenue: number;
  lost_revenue: number;
  total_slots: number;
  free_slots: number;
  busy_slots: number;
  total_minutes: number;
  busy_minutes: number;
  occupancy_percent: number;
}

export class BookingApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;
  constructor(status: number, message: string, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("user_token") || "";
  const adminToken = localStorage.getItem("admin_token") || "";
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Session-Token": token } : {}),
      ...(adminToken ? { "X-Admin-Token": adminToken } : {}),
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    // Backend возвращает { error: <code>, message: <human-readable>, details: {...} }
    // для конфликтов 409. Сохраняем всю структуру, чтобы UI мог показать понятный текст.
    const message = err.message || err.error || `HTTP ${response.status}`;
    throw new BookingApiError(response.status, message, err.error, err.details);
  }
  return response.json();
}

export const masterCalendarApi = {
  getWeekView: (masterId: number, weekStart?: string, dateFrom?: string, dateTo?: string) => {
    let url = `${CALENDAR_URL}&sub=week-view&master_id=${masterId}`;
    if (dateFrom && dateTo) {
      url += `&date_from=${dateFrom}&date_to=${dateTo}`;
    } else if (weekStart) {
      url += `&week_start=${weekStart}`;
    }
    return fetchApi<WeekViewData>(url);
  },

  getSlots: (masterId: number, dateFrom?: string, dateTo?: string) => {
    let url = `${CALENDAR_URL}&sub=slots&master_id=${masterId}`;
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;
    return fetchApi<MasterSlot[]>(url);
  },

  createSlot: (data: Partial<MasterSlot>) =>
    fetchApi<MasterSlot>(`${CALENDAR_URL}&sub=slots`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSlot: (data: Partial<MasterSlot> & { id: number }) =>
    fetchApi<MasterSlot>(`${CALENDAR_URL}&sub=slots`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteSlot: (id: number) =>
    fetchApi(`${CALENDAR_URL}&sub=slots`, {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),

  blockSlot: (id: number) =>
    fetchApi<MasterSlot>(`${CALENDAR_URL}&sub=slots`, {
      method: "PUT",
      body: JSON.stringify({ id, status: "blocked" }),
    }),

  unblockSlot: (id: number) =>
    fetchApi<MasterSlot>(`${CALENDAR_URL}&sub=slots`, {
      method: "PUT",
      body: JSON.stringify({ id, status: "available" }),
    }),

  getServices: (masterId: number) =>
    fetchApi<MasterService[]>(`${CALENDAR_URL}&sub=services&master_id=${masterId}`),

  createService: (data: Partial<MasterService>) =>
    fetchApi<MasterService>(`${CALENDAR_URL}&sub=services`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateService: (data: Partial<MasterService> & { id: number }) =>
    fetchApi<MasterService>(`${CALENDAR_URL}&sub=services`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteService: (id: number) =>
    fetchApi(`${CALENDAR_URL}&sub=services`, {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),

  getAddresses: (masterId: number) =>
    fetchApi<MasterAddress[]>(`${CALENDAR_URL}&sub=addresses&master_id=${masterId}`),

  createAddress: (data: Partial<MasterAddress> & { master_id: number }) =>
    fetchApi<MasterAddress>(`${CALENDAR_URL}&sub=addresses`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAddress: (data: Partial<MasterAddress> & { id: number; master_id: number }) =>
    fetchApi<MasterAddress>(`${CALENDAR_URL}&sub=addresses`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteAddress: (id: number, masterId: number) =>
    fetchApi(`${CALENDAR_URL}&sub=addresses`, {
      method: "DELETE",
      body: JSON.stringify({ id, master_id: masterId }),
    }),

  setPrimaryAddress: (id: number, masterId: number) =>
    fetchApi<MasterAddress>(`${CALENDAR_URL}&sub=set-primary-address`, {
      method: "POST",
      body: JSON.stringify({ id, master_id: masterId }),
    }),

  getMapsKey: () =>
    fetchApi<{ apikey: string }>(`${CALENDAR_URL}&sub=maps-key`),

  geocode: (query: string) =>
    fetchApi<{ results: { address: string; lat: number; lng: number }[] }>(
      `${CALENDAR_URL}&sub=geocode&q=${encodeURIComponent(query)}`
    ),

  reverseGeocode: (lat: number, lng: number) =>
    fetchApi<{ results: { address: string; lat: number; lng: number }[] }>(
      `${CALENDAR_URL}&sub=geocode&lat=${lat}&lng=${lng}`
    ),

  getTemplates: (masterId: number) =>
    fetchApi<ScheduleTemplate[]>(`${CALENDAR_URL}&sub=templates&master_id=${masterId}`),

  createTemplate: (data: { master_id: number; name: string; rules: TemplateRule[] }) =>
    fetchApi<ScheduleTemplate>(`${CALENDAR_URL}&sub=templates`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTemplate: (data: { id: number; name?: string; rules?: TemplateRule[] }) =>
    fetchApi(`${CALENDAR_URL}&sub=templates`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTemplate: (id: number) =>
    fetchApi(`${CALENDAR_URL}&sub=templates`, {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),

  applyTemplate: (data: { template_id: number; master_id: number; weeks: number; start_date?: string }) =>
    fetchApi<{ success: boolean; created: number; skipped: number; period: string }>(
      `${CALENDAR_URL}&sub=apply-template`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  getSettings: (masterId: number) =>
    fetchApi<CalendarSettings>(`${CALENDAR_URL}&sub=settings&master_id=${masterId}`),

  saveSettings: (data: Partial<CalendarSettings>) =>
    fetchApi<CalendarSettings>(`${CALENDAR_URL}&sub=settings`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getBlocks: (masterId: number) =>
    fetchApi<DayBlock[]>(`${CALENDAR_URL}&sub=blocks&master_id=${masterId}`),

  createBlock: async (data: Partial<DayBlock> & { force?: boolean }) => {
    const response = await fetch(`${CALENDAR_URL}&sub=blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 409 && payload?.error === "has_active_bookings") {
      return {
        conflict: true as const,
        message: payload.message as string,
        conflicts: (payload.conflicts || []) as Array<{
          id: number;
          client_name: string;
          client_phone: string;
          datetime_start: string;
          status: string;
          service_name?: string;
        }>,
      };
    }
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    return { conflict: false as const, ...payload };
  },

  deleteBlock: (id: number, masterId: number) =>
    fetchApi(`${CALENDAR_URL}&sub=blocks`, {
      method: "DELETE",
      body: JSON.stringify({ id, master_id: masterId }),
    }),

  clearCalendar: (data: {
    master_id: number;
    scope: "all" | "slots" | "bookings" | "blocks";
    date_from?: string;
    date_to?: string;
  }) =>
    fetchApi<{ success: boolean; deleted: { bookings: number; slots: number; blocks: number }; backup_url?: string | null }>(
      `${CALENDAR_URL}&sub=clear`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  // Корзина: список заархивированных записей и резервных копий
  getTrash: (masterId: number) =>
    fetchApi<{ bookings: MasterBooking[]; backups: MasterBackup[] }>(
      `${CALENDAR_URL}&sub=trash&master_id=${masterId}`
    ),

  // Восстановить записи из корзины (ids — конкретные, либо пусто = все)
  restoreBookings: (masterId: number, ids?: number[]) =>
    fetchApi<{ success: boolean; restored: number }>(
      `${CALENDAR_URL}&sub=restore`,
      { method: "POST", body: JSON.stringify({ master_id: masterId, ids: ids || [] }) }
    ),

  // Создать резервную копию записей прямо сейчас
  createBackup: (masterId: number) =>
    fetchApi<{ success: boolean; backup_url?: string | null; bookings_count: number }>(
      `${CALENDAR_URL}&sub=backup`,
      { method: "POST", body: JSON.stringify({ master_id: masterId }) }
    ),
};

export interface MasterBackup {
  id: number;
  reason: string;
  bookings_count: number;
  file_url: string | null;
  created_at: string;
}

const REVIEWS_URL = `${MASTERS_URL}?resource=reviews`;

export const masterBookingsApi = {
  getBookings: (masterId: number, status?: string, dateFrom?: string, dateTo?: string) => {
    let url = `${BOOKINGS_URL}&sub=bookings&master_id=${masterId}`;
    if (status) url += `&status=${status}`;
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;
    return fetchApi<MasterBooking[]>(url);
  },

  createBooking: (data: Partial<MasterBooking>) =>
    fetchApi<MasterBooking>(`${BOOKINGS_URL}&sub=bookings`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateBooking: (data: { id: number; action: string; cancel_reason?: string }) =>
    fetchApi<MasterBooking>(`${BOOKINGS_URL}&sub=bookings`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  rescheduleBooking: (data: { id: number; datetime_start: string; datetime_end: string }) =>
    fetchApi<MasterBooking>(`${BOOKINGS_URL}&sub=bookings`, {
      method: "PUT",
      body: JSON.stringify({ ...data, action: "reschedule" }),
    }),

  getStats: (masterId: number, period?: string) => {
    let url = `${BOOKINGS_URL}&sub=stats&master_id=${masterId}`;
    if (period) url += `&period=${period}`;
    return fetchApi<BookingStats>(url);
  },

  getPublicSlots: (masterId: number, dateFrom?: string) => {
    let url = `${BOOKINGS_URL}&sub=public-slots&master_id=${masterId}`;
    if (dateFrom) url += `&date_from=${dateFrom}`;
    return fetchApi<{
      slots: MasterSlot[];
      bookings: Array<{ id: number; slot_id: number; datetime_start: string; datetime_end: string; status: string }>;
    }>(url);
  },

  getPublicSettings: (masterId: number) =>
    fetchApi<{ break_between_slots: number; prep_time: number; timezone: string }>(
      `${BOOKINGS_URL}&sub=public-settings&master_id=${masterId}`
    ),

  publicBook: (data: {
    slot_id: number;
    service_id?: number;
    desired_start?: string;
    desired_end?: string;
    client_name: string;
    client_phone: string;
    client_email?: string;
    comment?: string;
    contraindications_accepted?: boolean;
    contraindications_snapshot?: string;
    meeting_address?: string;
    meeting_latitude?: number;
    meeting_longitude?: number;
  }) =>
    fetchApi(`${BOOKINGS_URL}&sub=public-book`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getReviews: (masterId: number) =>
    fetchApi<MasterReview[]>(`${REVIEWS_URL}&master_id=${masterId}`),

  createReview: (data: { master_id: number; client_name: string; client_phone?: string; rating: number; text?: string }) =>
    fetchApi<MasterReview>(`${REVIEWS_URL}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export interface MasterReview {
  id: number;
  master_id: number;
  client_name: string;
  rating: number;
  text?: string;
  created_at: string;
}

// ─── Чат мастер↔гость ───────────────────────────────────────────────
const CHAT_URL = `${MASTERS_URL}?resource=chat`;

export interface ChatMessage {
  id: number;
  direction: "in" | "out";
  channel: string;
  body: string;
  delivered: boolean | null;
  created_at: string;
  read_at?: string | null;
}

export type ChatSource = "booking" | "inquiry";

export interface ChatDialog {
  source: ChatSource;
  id: number;
  booking_id: number;
  client_name: string;
  client_phone: string;
  status: string;
  datetime_start: string | null;
  reply_token: string;
  service_name?: string | null;
  last_body?: string | null;
  last_direction?: "in" | "out" | null;
  last_at?: string | null;
  unread_count: number;
  messages_count: number;
}

export const masterChatApi = {
  getDialogs: (masterId: number) =>
    fetchApi<{ dialogs: ChatDialog[] }>(`${CHAT_URL}&sub=dialogs&master_id=${masterId}`),

  getUnreadCount: (masterId: number) =>
    fetchApi<{ unread: number }>(`${CHAT_URL}&sub=unread_count&master_id=${masterId}`),

  getMessages: (threadId: number, source: ChatSource = "booking") =>
    fetchApi<{ messages: ChatMessage[]; client_name: string }>(
      `${CHAT_URL}&sub=messages&booking_id=${threadId}&source=${source}`
    ),

  send: (masterId: number, threadId: number, message: string, source: ChatSource = "booking") =>
    fetchApi<{ ok: boolean; message: ChatMessage }>(`${CHAT_URL}&sub=send`, {
      method: "POST",
      body: JSON.stringify({ master_id: masterId, booking_id: threadId, source, message }),
    }),

  // Публичный чат гостя по токену (без авторизации)
  getPublic: (token: string) =>
    fetchApi<{
      guest_name: string;
      master_name: string;
      service_name?: string | null;
      status: string;
      datetime_start?: string | null;
      messages: ChatMessage[];
    }>(`${CHAT_URL}&sub=public&token=${encodeURIComponent(token)}`),

  sendPublic: (token: string, message: string) =>
    fetchApi<{ ok: boolean; message: ChatMessage }>(`${CHAT_URL}&sub=public`, {
      method: "POST",
      body: JSON.stringify({ token, message }),
    }),

  // Публичное обращение к мастеру (вопрос без брони)
  createInquiry: (data: {
    master_id: number;
    name: string;
    contact: string;
    contact_type: "email" | "phone" | "telegram";
    message: string;
  }) =>
    fetchApi<{ ok: boolean; inquiry_id: number; chat_token: string }>(
      `${MASTERS_URL}?resource=inquiry&sub=create`,
      { method: "POST", body: JSON.stringify(data) }
    ),
};

export default { masterCalendarApi, masterBookingsApi, masterChatApi };