import FUNC_URLS from "../../backend/func2url.json";

const CALENDAR_URL = FUNC_URLS["master-calendar"];
const BOOKINGS_URL = FUNC_URLS["master-bookings"];

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
    let url = `${CALENDAR_URL}?resource=week-view&master_id=${masterId}`;
    if (weekStart) url += `&week_start=${weekStart}`;
    return fetchApi<WeekViewData>(url);
  },

  getSlots: (masterId: number, dateFrom?: string, dateTo?: string) => {
    let url = `${CALENDAR_URL}?resource=slots&master_id=${masterId}`;
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;
    return fetchApi<MasterSlot[]>(url);
  },

  createSlot: (data: Partial<MasterSlot>) =>
    fetchApi<MasterSlot>(`${CALENDAR_URL}?resource=slots`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSlot: (data: Partial<MasterSlot> & { id: number }) =>
    fetchApi<MasterSlot>(`${CALENDAR_URL}?resource=slots`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteSlot: (id: number) =>
    fetchApi(`${CALENDAR_URL}?resource=slots`, {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),

  getServices: (masterId: number) =>
    fetchApi<MasterService[]>(`${CALENDAR_URL}?resource=services&master_id=${masterId}`),

  createService: (data: Partial<MasterService>) =>
    fetchApi<MasterService>(`${CALENDAR_URL}?resource=services`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateService: (data: Partial<MasterService> & { id: number }) =>
    fetchApi<MasterService>(`${CALENDAR_URL}?resource=services`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteService: (id: number) =>
    fetchApi(`${CALENDAR_URL}?resource=services`, {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),

  getTemplates: (masterId: number) =>
    fetchApi<ScheduleTemplate[]>(`${CALENDAR_URL}?resource=templates&master_id=${masterId}`),

  createTemplate: (data: { master_id: number; name: string; rules: TemplateRule[] }) =>
    fetchApi<ScheduleTemplate>(`${CALENDAR_URL}?resource=templates`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTemplate: (data: { id: number; name?: string; rules?: TemplateRule[] }) =>
    fetchApi(`${CALENDAR_URL}?resource=templates`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTemplate: (id: number) =>
    fetchApi(`${CALENDAR_URL}?resource=templates`, {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),

  applyTemplate: (data: { template_id: number; master_id: number; weeks: number; start_date?: string }) =>
    fetchApi<{ success: boolean; created: number; skipped: number; period: string }>(
      `${CALENDAR_URL}?resource=apply-template`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  getSettings: (masterId: number) =>
    fetchApi<CalendarSettings>(`${CALENDAR_URL}?resource=settings&master_id=${masterId}`),

  saveSettings: (data: Partial<CalendarSettings>) =>
    fetchApi<CalendarSettings>(`${CALENDAR_URL}?resource=settings`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getBlocks: (masterId: number) =>
    fetchApi<DayBlock[]>(`${CALENDAR_URL}?resource=blocks&master_id=${masterId}`),

  createBlock: (data: Partial<DayBlock>) =>
    fetchApi(`${CALENDAR_URL}?resource=blocks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteBlock: (id: number, masterId: number) =>
    fetchApi(`${CALENDAR_URL}?resource=blocks`, {
      method: "DELETE",
      body: JSON.stringify({ id, master_id: masterId }),
    }),
};

export const masterBookingsApi = {
  getBookings: (masterId: number, status?: string, dateFrom?: string, dateTo?: string) => {
    let url = `${BOOKINGS_URL}?resource=bookings&master_id=${masterId}`;
    if (status) url += `&status=${status}`;
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;
    return fetchApi<MasterBooking[]>(url);
  },

  createBooking: (data: Partial<MasterBooking>) =>
    fetchApi<MasterBooking>(`${BOOKINGS_URL}?resource=bookings`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateBooking: (data: { id: number; action: string; cancel_reason?: string }) =>
    fetchApi<MasterBooking>(`${BOOKINGS_URL}?resource=bookings`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getStats: (masterId: number, period?: string) => {
    let url = `${BOOKINGS_URL}?resource=stats&master_id=${masterId}`;
    if (period) url += `&period=${period}`;
    return fetchApi<BookingStats>(url);
  },

  getPublicSlots: (masterId: number, dateFrom?: string, serviceId?: number) => {
    let url = `${BOOKINGS_URL}?resource=public-slots&master_id=${masterId}`;
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (serviceId) url += `&service_id=${serviceId}`;
    return fetchApi<MasterSlot[]>(url);
  },

  publicBook: (data: { slot_id: number; client_name: string; client_phone: string; client_email?: string; comment?: string }) =>
    fetchApi(`${BOOKINGS_URL}?resource=public-book`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getReviews: (masterId: number) =>
    fetchApi<MasterReview[]>(`${BOOKINGS_URL}?resource=reviews&master_id=${masterId}`),

  createReview: (data: { master_id: number; client_name: string; client_phone?: string; rating: number; text?: string }) =>
    fetchApi<MasterReview>(`${BOOKINGS_URL}?resource=reviews`, {
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