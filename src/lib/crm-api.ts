import { authenticatedRequest } from "@/lib/http";

const BASE = "https://functions.poehali.dev/ceabf12a-ab18-40fd-8265-60883f655b47";

export interface CrmTag {
  id: number;
  name: string;
  color: string;
  clients_count?: number;
  created_at?: string;
}

export interface CrmClient {
  client_key: string;
  name: string;
  phone: string;
  email: string;
  telegram: string;
  user_id: number | null;
  visits_count: number;
  total_spent: number;
  last_visit_at: string | null;
  first_visit_at: string | null;
  sources: string[];
  tags: CrmTag[];
}

export interface CrmHistoryItem {
  kind: "event" | "master" | "ritual";
  signup_id?: number;
  event_id?: number;
  event_slug?: string;
  title: string;
  status: string;
  amount: number;
  date: string | null;
  created_at: string;
  bath_name?: string;
  time?: string;
}

export interface CrmNote {
  id: number;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface CrmClientCard {
  client: CrmClient & { avatar_url?: string | null; vk?: string };
  history: CrmHistoryItem[];
  notes: CrmNote[];
  tags: CrmTag[];
  stats: { total_spent: number; visits_count: number; total_bookings: number };
}

export const crmApi = {
  listClients: (search?: string): Promise<{ clients: CrmClient[]; total: number }> => {
    const qs = new URLSearchParams({ resource: "clients" });
    if (search) qs.set("search", search);
    return authenticatedRequest(`${BASE}/?${qs.toString()}`);
  },

  getClient: (key: string): Promise<CrmClientCard> =>
    authenticatedRequest(`${BASE}/?resource=client&key=${encodeURIComponent(key)}`),

  listTags: (): Promise<{ tags: CrmTag[] }> =>
    authenticatedRequest(`${BASE}/?resource=tags`),

  createTag: (name: string, color: string): Promise<{ tag: CrmTag }> =>
    authenticatedRequest(`${BASE}/?resource=tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    }),

  deleteTag: (id: number): Promise<{ ok: boolean }> =>
    authenticatedRequest(`${BASE}/?resource=tags&id=${id}`, { method: "DELETE" }),

  toggleClientTag: (clientKey: string, tagId: number, action: "add" | "remove"): Promise<{ ok: boolean }> =>
    authenticatedRequest(`${BASE}/?resource=client_tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_key: clientKey, tag_id: tagId, action }),
    }),

  createNote: (clientKey: string, body: string): Promise<{ note: CrmNote }> =>
    authenticatedRequest(`${BASE}/?resource=notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_key: clientKey, body }),
    }),

  updateNote: (id: number, body: string): Promise<{ note: CrmNote }> =>
    authenticatedRequest(`${BASE}/?resource=notes&id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }),

  addExternalGuest: (data: {
    name: string;
    phone?: string;
    email?: string;
    telegram?: string;
    vk?: string;
    source?: string;
  }): Promise<{ created: boolean; guest?: Record<string, unknown>; duplicate_id?: number }> =>
    authenticatedRequest(`${BASE}/?resource=external_guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  importCsv: (rows: CrmImportRow[]): Promise<CrmImportResult> =>
    authenticatedRequest(`${BASE}/?resource=import_csv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, source: "csv" }),
    }),
};

export interface CrmImportRow {
  name: string;
  phone?: string;
  email?: string;
  telegram?: string;
  vk?: string;
  note?: string;
}

export interface CrmImportResult {
  total: number;
  created: number;
  skipped_duplicates: number;
  errors: Array<{ row: number; reason: string }>;
}