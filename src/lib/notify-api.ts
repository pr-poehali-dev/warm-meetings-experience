const BASE = "https://functions.poehali.dev/47bb36f1-5d1a-45e7-86e3-bd7a07a3d8de";

function token() {
  return localStorage.getItem("user_token") || "";
}

function headers() {
  return { "Content-Type": "application/json", "X-Session-Token": token() };
}

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ...headers(), ...(options?.headers || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Что-то пошло не так");
  return data as T;
}

// ─── Типы ─────────────────────────────────────────────────────────────────────

export type TriggerType = "manual" | "before_event" | "after_event" | "on_signup" | "on_status_change";
export type NotifyChannel = "email" | "telegram" | "vk";

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
  user_id: number | null;
  tg_username: string | null;
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
  total: number;
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

  getRecipients(eventId: number): Promise<{ recipients: NotifyRecipient[]; total: number }> {
    return req(`${BASE}?resource=recipients&event_id=${eventId}`);
  },

  send(data: {
    event_id?: number;
    signup_ids?: number[];
    scenario_id?: number;
    channel?: NotifyChannel;
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
};

export const CHANNEL_ICONS: Record<NotifyChannel, string> = {
  email: "Mail",
  telegram: "Send",
  vk: "MessageCircle",
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
