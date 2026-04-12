import { authenticatedRequest } from "@/lib/http";

const BASE = "https://functions.poehali.dev/730d60f4-a9cf-4f56-90d9-f48caaa9007d";

export interface PricingTier {
  id?: number;
  event_id?: number;
  label: string;
  price_amount: number;
  valid_until: string | null;
  sort_order?: number;
}

export interface OrgEvent {
  id: number;
  title: string;
  slug: string;
  event_date: string;
  start_time: string;
  end_time: string;
  bath_name: string;
  bath_address: string;
  total_spots: number;
  spots_left: number;
  price_amount: number;
  price_label: string;
  image_url: string;
  is_visible: boolean;
  event_type: string;
  event_type_icon: string;
  organizer_id: number;
  signups_count: number;
  paid_count: number;
  short_description: string;
  full_description: string;
  description: string;
  program: string[];
  rules: string[];
  pricing_lines: string[];
  pricing_type: 'fixed' | 'dynamic';
  pricing_tiers?: PricingTier[];
  featured: boolean;
  occupancy: string;
  created_at: string;
}

export interface OrgParticipant {
  id: number;
  event_id: number;
  name: string;
  phone: string;
  email: string;
  telegram: string;
  status: string;
  comment: string;
  attended: boolean | null;
  payment_type: string | null;
  payment_amount: number;
  created_at: string;
  user_id?: number | null;
  consent_photo?: "yes" | "no" | null;
}

export interface CoOrganizer {
  id: number;
  event_id: number;
  user_id: number;
  added_by: number;
  created_at: string;
  name: string;
  email: string;
  telegram: string;
  display_name: string | null;
  photo_url: string | null;
}

export interface UserSearchResult {
  id: number;
  name: string;
  email: string;
  telegram: string;
  display_name: string | null;
  photo_url: string | null;
  is_organizer: boolean;
}

export interface DashboardData {
  user: { id: number; name: string; email: string; phone: string; telegram: string };
  is_admin: boolean;
  stats: {
    total_events: number;
    upcoming_events: number;
    drafts: number;
    total_participants: number;
  };
  upcoming_events: OrgEvent[];
  profile: { display_name: string; bio: string; photo_url: string; telegram_chat_id: number | null } | null;
  tg_linked: boolean;
  tg_channels_count: number;
}

export const organizerApi = {
  getDashboard: (): Promise<DashboardData> =>
    authenticatedRequest(`${BASE}/?resource=dashboard`),

  getEvents: (status: "all" | "active" | "past" | "drafts" = "all"): Promise<OrgEvent[]> =>
    authenticatedRequest(`${BASE}/?resource=events&status=${status}`),

  getEvent: (id: number): Promise<OrgEvent> =>
    authenticatedRequest(`${BASE}/?resource=events&id=${id}`),

  createEvent: (data: Partial<OrgEvent>): Promise<OrgEvent> =>
    authenticatedRequest(`${BASE}/?resource=events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateEvent: (data: Partial<OrgEvent> & { id: number }): Promise<OrgEvent> =>
    authenticatedRequest(`${BASE}/?resource=events`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteEvent: (id: number): Promise<void> =>
    authenticatedRequest(`${BASE}/?resource=events&id=${id}`, { method: "DELETE" }),

  getParticipants: (eventId: number): Promise<OrgParticipant[]> =>
    authenticatedRequest(`${BASE}/?resource=participants&event_id=${eventId}`),

  addParticipant: (data: { event_id: number; name: string; phone: string; email?: string; telegram?: string; status?: string; payment_type?: string; payment_amount?: number }): Promise<OrgParticipant> =>
    authenticatedRequest(`${BASE}/?resource=participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateParticipant: (id: number, data: Partial<OrgParticipant>): Promise<OrgParticipant> =>
    authenticatedRequest(`${BASE}/?resource=participants`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    }),

  getPricingTiers: (eventId: number): Promise<PricingTier[]> =>
    authenticatedRequest(`${BASE}/?resource=pricing_tiers&event_id=${eventId}`),

  savePricingTiers: (eventId: number, tiers: PricingTier[]): Promise<PricingTier[]> =>
    authenticatedRequest(`${BASE}/?resource=pricing_tiers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, tiers }),
    }),

  searchUsers: (q: string): Promise<UserSearchResult[]> =>
    authenticatedRequest(`${BASE}/?resource=user_search&q=${encodeURIComponent(q)}`),

  getCoOrganizers: (eventId: number): Promise<CoOrganizer[]> =>
    authenticatedRequest(`${BASE}/?resource=co_organizers&event_id=${eventId}`),

  addCoOrganizer: (eventId: number, userId: number): Promise<CoOrganizer> =>
    authenticatedRequest(`${BASE}/?resource=co_organizers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, user_id: userId }),
    }),

  joinByInvite: (eventId: number): Promise<{ ok: boolean; already?: boolean; status?: 'active' | 'pending' | 'owner' }> =>
    authenticatedRequest(`${BASE}/?resource=co_organizers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join_by_invite", event_id: eventId }),
    }),

  removeCoOrganizer: (eventId: number, userId: number): Promise<void> =>
    authenticatedRequest(
      `${BASE}/?resource=co_organizers&event_id=${eventId}&user_id=${userId}`,
      { method: "DELETE" }
    ),

  sendInviteEmail: (eventId: number, email: string): Promise<{ ok: boolean; already_sent?: boolean }> =>
    authenticatedRequest(`${BASE}/?resource=send_invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, email }),
    }),

  verifyInvite: (token: string): Promise<{ ok: boolean; status: 'active' | 'pending' | 'owner'; already?: boolean }> =>
    authenticatedRequest(`${BASE}/?resource=verify_invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }),

  getTelegramCode: (): Promise<{ code: string }> => {
    const token = localStorage.getItem("session_token") || "";
    return fetch(`https://functions.poehali.dev/c54f8799-96a5-4519-a2c7-e1b2e5f9d8c1/?action=generate_code&token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        return data;
      });
  },
};