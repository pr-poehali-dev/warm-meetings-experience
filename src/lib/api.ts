import { request } from "@/lib/http";

const EVENTS_API = "https://functions.poehali.dev/a8aa8917-24e9-450a-8ed1-28225a582a59";
const AUTH_API = "https://functions.poehali.dev/3f8dabee-7ea7-4701-8e3f-9ef3affcd6fe";
const IMAGE_API = "https://functions.poehali.dev/bc598664-ac65-4fb1-af0a-cba338dcfaf7";

export interface EventFromAPI {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  full_description: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  event_type: string;
  event_type_icon: string;
  occupancy: string;
  bath_name: string;
  bath_address: string;
  image_url: string;
  price: string;
  price_amount: number;
  price_label: string;
  total_spots: number;
  spots_left: number;
  featured: boolean;
  is_visible: boolean;
  program: string[];
  rules: string[];
  pricing_lines: string[];
  pricing_type?: 'fixed' | 'dynamic';
  pricing_tiers?: import('@/lib/organizer-api').PricingTier[];
  created_at: string;
  updated_at: string;
}

export interface SignupFromAPI {
  id: number;
  event_id: number;
  name: string;
  phone: string;
  email?: string;
  telegram: string;
  status: string;
  comment?: string;
  created_at: string;
  event_title?: string;
  event_date?: string;
}

export const eventsApi = {
  getAll: (visibleOnly = true): Promise<EventFromAPI[]> =>
    request(`${EVENTS_API}/?resource=events&visible=${visibleOnly ? "true" : "all"}`),

  getBySlug: (slug: string): Promise<EventFromAPI> =>
    request(`${EVENTS_API}/?resource=events&slug=${slug}`),

  getByShortCode: (code: string): Promise<EventFromAPI> =>
    request(`${EVENTS_API}/?resource=events&short_code=${code}`),

  create: (data: Partial<EventFromAPI>): Promise<EventFromAPI> =>
    request(`${EVENTS_API}/?resource=events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  update: (data: Partial<EventFromAPI> & { id: number }): Promise<EventFromAPI> =>
    request(`${EVENTS_API}/?resource=events`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  remove: (id: number): Promise<void> =>
    request(`${EVENTS_API}/?resource=events&id=${id}`, { method: "DELETE" }),
};

export const signupsApi = {
  getAll: (eventId?: number): Promise<SignupFromAPI[]> =>
    request(`${EVENTS_API}/?resource=signups${eventId ? `&event_id=${eventId}` : ""}`),

  create: (data: { event_id: number; name: string; phone: string; email: string; telegram?: string; consent_pd: boolean; preferred_channel?: string; preferred_contact_value?: string }): Promise<SignupFromAPI> =>
    request(`${EVENTS_API}/?resource=signups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateStatus: (id: number, status: string): Promise<SignupFromAPI> =>
    request(`${EVENTS_API}/?resource=signups`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }),

  update: (id: number, data: Partial<Pick<SignupFromAPI, "name" | "phone" | "telegram" | "status" | "comment">>): Promise<SignupFromAPI> =>
    request(`${EVENTS_API}/?resource=signups`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    }),
};

export const authApi = {
  login: (password: string): Promise<{ token: string; expires_at: string }> =>
    request(AUTH_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }),
};

export const imageApi = {
  upload: (base64: string, filename: string): Promise<{ url: string }> =>
    request(IMAGE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, filename }),
    }),
};

export default { eventsApi, signupsApi, authApi, imageApi };