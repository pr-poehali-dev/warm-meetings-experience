import { request, authenticatedRequest } from "@/lib/http";
import func2url from "../../backend/func2url.json";

const MASTERS_API = func2url["masters-api"];

export interface Specialization {
  id: number;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
}

export interface MasterBath {
  id: number;
  slug: string;
  name: string;
  address: string;
  city: string;
  photos: Array<{ key: string; url: string; type: string; mime: string } | string>;
  rating: number;
  schedule?: string;
}

export interface Master {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  bio: string;
  experience_years: number;
  city: string;
  phone: string;
  telegram: string;
  instagram: string;
  avatar: string;
  photos: Array<{ key: string; url: string } | string>;
  portfolio: Array<{ key: string; url: string; caption?: string }>;
  specialization_ids: number[];
  specializations?: Specialization[];
  baths?: MasterBath[];
  rating: number;
  reviews_count: number;
  price_from: number;
  is_active?: boolean;
  is_verified?: boolean;
  hidden_by_owner?: boolean;
  verification_note?: string | null;
  verified_at?: string | null;
  verification_requested_at?: string | null;
}

export interface MasterFilters {
  search?: string;
  city?: string;
  specialization?: string;
  bath_id?: number;
}

export const mastersApi = {
  getAll: async (filters: MasterFilters = {}): Promise<Master[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.city) params.set("city", filters.city);
    if (filters.specialization) params.set("specialization", filters.specialization);
    if (filters.bath_id) params.set("bath_id", String(filters.bath_id));

    const data = await request(`${MASTERS_API}/?${params}`);
    return data.masters || [];
  },

  getBySlug: async (slug: string): Promise<Master> => {
    const data = await request(`${MASTERS_API}/?slug=${slug}`);
    return data.master;
  },

  getSpecializations: async (): Promise<Specialization[]> => {
    const data = await request(`${MASTERS_API}/?specializations=1`);
    return data.specializations || [];
  },

  getMyProfile: async (): Promise<Master> => {
    const data = await authenticatedRequest(`${MASTERS_API}/?me=1`);
    return data.master;
  },

  updateMyProfile: async (profile: Partial<Pick<Master, "name" | "tagline" | "bio" | "experience_years" | "city" | "phone" | "telegram" | "instagram" | "price_from" | "portfolio" | "photos" | "avatar">>): Promise<Partial<Master>> => {
    const data = await authenticatedRequest(`${MASTERS_API}/?me=1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    return data.master || {};
  },

  // Переключить видимость профиля в публичном каталоге.
  // Не влияет на верификацию и не отправляет профиль на повторную проверку.
  setVisibility: async (hidden: boolean): Promise<Partial<Master>> => {
    const data = await authenticatedRequest(`${MASTERS_API}/?me=1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden_by_owner: hidden }),
    });
    return data.master || {};
  },
};