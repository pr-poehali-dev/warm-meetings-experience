import func2url from "../../backend/func2url.json";

const BATHS_API = func2url["baths-api"];

export interface Bath {
  id: number;
  slug: string;
  name: string;
  description: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  website: string;
  photos: Array<{ key: string; url: string; type: string; mime: string } | string>;
  videos: Array<{ key: string; url: string; type: string; mime: string }>;
  features: string[];
  bath_types: string[];
  capacity_min: number;
  capacity_max: number;
  price_from: number;
  price_per_hour: number;
  rating: number;
  reviews_count: number;
  is_active?: boolean;
}

export interface BathFilters {
  search?: string;
  city?: string;
  bath_type?: string;
  feature?: string;
  price_max?: number;
}

export const bathsApi = {
  getAll: async (filters: BathFilters = {}): Promise<Bath[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.city) params.set("city", filters.city);
    if (filters.bath_type) params.set("bath_type", filters.bath_type);
    if (filters.feature) params.set("feature", filters.feature);
    if (filters.price_max) params.set("price_max", String(filters.price_max));

    const res = await fetch(`${BATHS_API}/?${params}`);
    const data = await res.json();
    return data.baths || [];
  },

  getBySlug: async (slug: string): Promise<Bath> => {
    const res = await fetch(`${BATHS_API}/?slug=${slug}`);
    if (!res.ok) throw new Error("Баня не найдена");
    const data = await res.json();
    return data.bath;
  },
};