import func2url from "../../../../backend/func2url.json";

const API = (func2url as Record<string, string>)["notification-hub"];

function token(): string {
  return localStorage.getItem("admin_token") || "";
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "X-Admin-Token": token(),
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ошибка запроса");
  return data;
}

export interface ChannelBody {
  text?: string;
  subject?: string;
  html?: string;
}

export interface Template {
  id: number;
  event_type: string;
  name: string;
  description: string;
  category: string;
  variables: string[];
  bodies: Record<string, ChannelBody>;
  default_channels: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LogEntry {
  id: number;
  channel: string;
  event_type: string;
  recipient: string | null;
  subject: string | null;
  status: string;
  error_text: string | null;
  created_at: string;
}

export interface Stats {
  totals: { total: number; success: number; failed: number };
  delivery_rate: number;
  by_channel: Record<string, { total: number; success: number; failed: number }>;
  by_event: { event_type: string; cnt: number }[];
}

export const hubApi = {
  listTemplates: (): Promise<{ templates: Template[] }> =>
    call("?resource=templates"),

  saveTemplate: (tpl: Partial<Template>): Promise<{ ok: boolean; id: number }> =>
    call("?resource=templates", { method: "POST", body: JSON.stringify(tpl) }),

  stats: (params = ""): Promise<Stats> =>
    call(`?resource=logs&action=stats${params}`),

  logs: (params = ""): Promise<{
    logs: LogEntry[];
    total: number;
    page: number;
    pages: number;
  }> => call(`?resource=logs${params}`),

  userChannels: (params = ""): Promise<{
    users: UserChannelRow[];
    total: number;
    page: number;
    pages: number;
  }> => call(`?resource=user_channels${params}`),

  setUserChannel: (
    user_id: number,
    channel: string,
    active: boolean
  ): Promise<{ ok: boolean }> =>
    call("?resource=user_channels", {
      method: "POST",
      body: JSON.stringify({ user_id, channel, active }),
    }),
};

export interface UserChannelState {
  connected: boolean;
  active: boolean;
}

export interface UserChannelRow {
  id: number;
  name: string;
  email: string | null;
  roles: string[];
  quiet_enabled: boolean;
  channels: Record<"telegram" | "email" | "vk", UserChannelState>;
}