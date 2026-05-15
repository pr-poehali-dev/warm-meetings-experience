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

export interface CrmEventGuest {
  signup_id: number;
  user_id: number | null;
  client_key: string;
  name: string;
  phone: string;
  email: string | null;
  telegram: string | null;
  status: string;
  payment_amount: number;
  payment_type: string | null;
  attended: boolean | null;
  comment: string | null;
  consent_pd: boolean;
  preferred_channel: string | null;
  wrote_at: string | null;
  created_at: string;
  club_fee_paid: number;
  final_price_due: number | null;
  topup_amount: number;
  joined_after_freeze: boolean;
  avatar_url: string | null;
  tags: CrmTag[];
}

export interface CrmEventGuestsResponse {
  mode: "event_guests";
  event: { id: number; title: string; event_date: string | null };
  guests: CrmEventGuest[];
  stats: { total: number; confirmed: number; cancelled: number; attended: number; total_paid: number };
}

export const crmApi = {
  listClients: (search?: string): Promise<{ clients: CrmClient[]; total: number }> => {
    const qs = new URLSearchParams({ resource: "clients" });
    if (search) qs.set("search", search);
    return authenticatedRequest(`${BASE}/?${qs.toString()}`);
  },

  listEventGuests: (eventId: number, search?: string): Promise<CrmEventGuestsResponse> => {
    const qs = new URLSearchParams({ resource: "clients", event_id: String(eventId) });
    if (search) qs.set("search", search);
    return authenticatedRequest(`${BASE}/?${qs.toString()}`);
  },

  updateEventGuest: (
    signupId: number,
    fields: Partial<{
      name: string; phone: string; email: string; telegram: string;
      status: string; payment_type: string; comment: string;
      payment_amount: number; club_fee_paid: number; topup_amount: number; final_price_due: number;
      attended: boolean; consent_pd: boolean;
    }>,
  ): Promise<{ ok: boolean }> =>
    authenticatedRequest(`${BASE}/?resource=event_guest`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signup_id: signupId, ...fields }),
    }),

  addEventGuest: (data: {
    event_id: number; name: string; phone?: string; email?: string; telegram?: string;
    status?: string; payment_type?: string; payment_amount?: number;
  }): Promise<{ guest: CrmEventGuest }> =>
    authenticatedRequest(`${BASE}/?resource=event_guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteEventGuest: (signupId: number): Promise<{ ok: boolean; deleted: number }> =>
    authenticatedRequest(`${BASE}/?resource=event_guest&signup_id=${signupId}`, {
      method: "DELETE",
    }),

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