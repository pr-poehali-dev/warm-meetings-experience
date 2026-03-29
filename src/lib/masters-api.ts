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

    const res = await fetch(`${MASTERS_API}/?${params}`);
    const data = await res.json();
    return data.masters || [];
  },

  getBySlug: async (slug: string): Promise<Master> => {
    const res = await fetch(`${MASTERS_API}/?slug=${slug}`);
    if (!res.ok) throw new Error("Мастер не найден");
    const data = await res.json();
    return data.master;
  },

  getSpecializations: async (): Promise<Specialization[]> => {
    const res = await fetch(`${MASTERS_API}/?specializations=1`);
    const data = await res.json();
    return data.specializations || [];
  },
};
