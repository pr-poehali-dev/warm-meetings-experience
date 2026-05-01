import { authenticatedRequest } from "@/lib/http";

const PARTNER_API = "https://functions.poehali.dev/3989724b-e648-40f8-9642-5310fb7fcb5d";

export interface PartnerBath {
  id: number;
  slug: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  website?: string;
  description?: string;
  is_active: boolean;
  is_verified: boolean;
  verification_requested_at?: string;
  price_from: number;
  price_per_hour: number;
  capacity_min: number;
  capacity_max: number;
  rating?: number;
  reviews_count: number;
  features?: string[];
  bath_types?: string[];
  work_hours?: Record<string, string>;
  social_links?: Record<string, string>;
  lat?: number;
  lng?: number;
  photos?: string[];
  views_30d?: number;
  cover_photo?: string;
  created_at: string;
  updated_at?: string;
  views_7d?: number;
}

export interface PartnerStats {
  counts: { total: number; active: number; verified: number };
  views: { views_7d: number; views_30d: number };
  views_by_day: { day: string; count: number }[];
}

export type BathFormData = Partial<Omit<PartnerBath, "id" | "slug" | "created_at" | "updated_at" | "rating" | "reviews_count" | "is_verified" | "verification_requested_at" | "views_30d" | "views_7d" | "cover_photo">>;

export const partnerApi = {
  listBaths: (): Promise<{ baths: PartnerBath[] }> =>
    authenticatedRequest(`${PARTNER_API}/?resource=baths`),

  getBath: (id: number): Promise<{ bath: PartnerBath }> =>
    authenticatedRequest(`${PARTNER_API}/?resource=baths&id=${id}`),

  createBath: (data: BathFormData): Promise<{ bath: PartnerBath; message: string }> =>
    authenticatedRequest(`${PARTNER_API}/?resource=baths`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateBath: (id: number, data: BathFormData): Promise<{ bath: PartnerBath; message: string }> =>
    authenticatedRequest(`${PARTNER_API}/?resource=baths&id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  requestVerify: (bath_id: number): Promise<{ message: string }> =>
    authenticatedRequest(`${PARTNER_API}/?resource=verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bath_id }),
    }),

  setActive: (bath_id: number, is_active: boolean): Promise<{ message: string }> =>
    authenticatedRequest(`${PARTNER_API}/?resource=deactivate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bath_id, is_active }),
    }),

  getStats: (bath_id?: number): Promise<PartnerStats> =>
    authenticatedRequest(`${PARTNER_API}/?resource=stats${bath_id ? `&id=${bath_id}` : ""}`),
};
