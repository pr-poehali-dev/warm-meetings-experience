import FUNC_URLS from "../../backend/func2url.json";

const MASTERS_URL = FUNC_URLS["masters-api"];
const CALENDAR_URL = `${MASTERS_URL}?resource=calendar`;
const BOOKINGS_URL = `${MASTERS_URL}?resource=bookings`;

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
  total_sessions: number;
  total_revenue: number;
  expected_revenue: number;
  total_slots: number;
  free_slots: number;
  busy_slots: number;
  occupancy_percent: number;
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Что-то пошло не так" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const masterCalendarApi = {
  getWeekView: (masterId: number, weekStart?: string) => {
    let url = `${CALENDAR_URL}&sub=week-view&master_id=${masterId}`;
    if (weekStart) url += `&week_start=${weekStart}`;
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

  createBlock: (data: Partial<DayBlock>) =>
    fetchApi(`${CALENDAR_URL}&sub=blocks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteBlock: (id: number, masterId: number) =>
    fetchApi(`${CALENDAR_URL}&sub=blocks`, {
      method: "DELETE",
      body: JSON.stringify({ id, master_id: masterId }),
    }),
};

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
    fetchApi<{ break_between_slots: number; prep_time: number }>(
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

export default { masterCalendarApi, masterBookingsApi };