import { authenticatedRequest } from "@/lib/http";

const BASE = "https://functions.poehali.dev/730d60f4-a9cf-4f56-90d9-f48caaa9007d";

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
  created_at: string;
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
  profile: { display_name: string; bio: string; photo_url: string } | null;
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

  addParticipant: (data: { event_id: number; name: string; phone: string; email?: string; telegram?: string; status?: string }): Promise<OrgParticipant> =>
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
};