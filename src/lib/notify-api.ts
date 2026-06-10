import { authenticatedRequest } from "@/lib/http";
import func2url from "../../backend/func2url.json";

const BASE = func2url["notify-module"];

function req<T>(url: string, options?: RequestInit): Promise<T> {
  return authenticatedRequest(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  }) as Promise<T>;
}

// ─── Типы ─────────────────────────────────────────────────────────────────────

export type TriggerType = "manual" | "before_event" | "after_event" | "on_signup" | "on_status_change";
export type NotifyChannel = "email" | "telegram" | "vk" | "site";
export type SendChannel = NotifyChannel | "auto";

export interface NotifyScenario {
  id: number;
  name: string;
  trigger_type: TriggerType;
  trigger_hours: number | null;
  trigger_status: string | null;
  channels: NotifyChannel[];
  subject: string;
  body_html: string;
  body_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotifyRecipient {
  id: number;
  name: string;
  email: string | null;
  telegram: string | null;
  status: string;
  preferred_channel: string | null;
  user_id: number | null;
  tg_username: string | null;
  vk_id: string | null;
  vk_notify_allowed: boolean | null;
  tg_chat_id: number | null;
  tg_notify_allowed: boolean | null;
  has_vk: boolean;
  has_tg: boolean;
  has_email: boolean;
  has_site?: boolean;
  auto_channel: NotifyChannel | null;
}

export interface NotifyLogEntry {
  id: number;
  channel: NotifyChannel;
  recipient_email: string | null;
  recipient_name: string | null;
  subject: string | null;
  status: "pending" | "sent" | "failed";
  error_text: string | null;
  sent_at: string | null;
  created_at: string;
  scenario_name: string | null;
  event_title: string | null;
}

export interface SendResult {
  sent: number;
  failed: number;
  skipped?: number;
  total: number;
  by_channel?: Record<string, number>;
  failures?: Array<{ signup_id: number; name: string; channel?: string; reason: string }>;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const notifyApi = {
  getScenarios(): Promise<{ scenarios: NotifyScenario[] }> {
    return req(`${BASE}?resource=scenarios`);
  },

  createScenario(data: Partial<NotifyScenario>): Promise<{ id: number; message: string }> {
    return req(`${BASE}?resource=scenarios`, { method: "POST", body: JSON.stringify(data) });
  },

  updateScenario(data: Partial<NotifyScenario> & { id: number }): Promise<{ message: string }> {
    return req(`${BASE}?resource=scenarios`, { method: "PUT", body: JSON.stringify(data) });
  },

  deleteScenario(id: number): Promise<{ message: string }> {
    return req(`${BASE}?resource=scenarios&id=${id}`, { method: "DELETE" });
  },

  getRecipients(eventId: number): Promise<{ recipients: NotifyRecipient[]; total: number; total_signups?: number; access_role?: "organizer" | "partner" | null }> {
    return req(`${BASE}?resource=recipients&event_id=${eventId}`);
  },

  getMasterRecipients(): Promise<{ recipients: NotifyRecipient[]; total: number }> {
    return req(`${BASE}?resource=recipients&source=master_booking`);
  },

  getMasterBookings(): Promise<{ bookings: MasterBookingShort[] }> {
    return req(`${BASE}?resource=master_bookings`);
  },

  getRitualRecipients(): Promise<{ recipients: NotifyRecipient[]; total: number }> {
    return req(`${BASE}?resource=recipients&source=ritual_booking`);
  },

  getRitualBookings(): Promise<{ bookings: RitualBookingShort[] }> {
    return req(`${BASE}?resource=ritual_bookings`);
  },

  getPartnerEvents(): Promise<{ events: PartnerEventShort[] }> {
    return req(`${BASE}?resource=partner_events`);
  },

  send(data: {
    source?: "event_signup" | "master_booking" | "ritual_booking";
    event_id?: number;
    signup_ids?: number[];
    booking_ids?: number[];
    scenario_id?: number;
    channel?: SendChannel;
    subject?: string;
    body_html?: string;
  }): Promise<SendResult> {
    return req(`${BASE}?resource=send`, { method: "POST", body: JSON.stringify(data) });
  },

  getLog(eventId?: number, limit = 50): Promise<{ log: NotifyLogEntry[] }> {
    const q = eventId ? `&event_id=${eventId}` : "";
    return req(`${BASE}?resource=log${q}&limit=${limit}`);
  },
};

export interface MasterBookingShort {
  id: number;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  datetime_start: string | null;
  status: string;
  service_name: string | null;
}

export interface RitualBookingShort {
  id: number;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  selected_date: string | null;
  status: string;
  ritual_name: string | null;
  location_name: string | null;
}

export interface PartnerEventShort {
  id: number;
  title: string;
  event_date: string | null;
  start_time: string | null;
  status: string;
  bath_name: string | null;
  image_url?: string | null;
  signups_count?: number;
}

// ─── Константы ────────────────────────────────────────────────────────────────

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  manual: "Вручную (по кнопке)",
  before_event: "За N часов до события",
  after_event: "Через N часов после события",
  on_signup: "При каждом новом участнике",
  on_status_change: "При смене статуса участника",
};

export const CHANNEL_LABELS: Record<NotifyChannel, string> = {
  email: "Email",
  telegram: "Telegram",
  vk: "ВКонтакте",
  site: "На сайте",
};

export const CHANNEL_ICONS: Record<NotifyChannel, string> = {
  email: "Mail",
  telegram: "Send",
  vk: "MessageCircle",
  site: "Globe",
};

// Переменные для подстановки в шаблон
export const TEMPLATE_VARS = [
  { key: "{{name}}", label: "Имя участника" },
  { key: "{{event_title}}", label: "Название события" },
  { key: "{{event_date}}", label: "Дата события" },
  { key: "{{event_time}}", label: "Время события" },
  { key: "{{bath_name}}", label: "Место проведения" },
  { key: "{{price}}", label: "Стоимость участия" },
];