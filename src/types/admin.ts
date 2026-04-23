export type ViewType =
  | "overview"
  | "list"
  | "add"
  | "packages"
  | "addons"
  | "bookings"
  | "service-areas"
  | "multipliers"
  | "holidays"
  | "promo-codes"
  | "settings"
  | "availability"
  | "event-signups"
  | "roles"
  | "blog"
  | "users"
  | "baths"
  | "masters"
  | "moderation";

export interface AdminEvent {
  id?: number;
  title: string;
  short_description: string;
  full_description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  occupancy: string;
  price: string;
  event_type: string;
  event_type_icon: string;
  image_url: string;
  is_visible: boolean;
  slug?: string;
  bath_name?: string;
  bath_address?: string;
  description?: string;
  program?: string[];
  rules?: string[];
  price_amount?: number;
  price_label?: string;
  total_spots?: number;
  spots_left?: number;
  featured?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const emptyEvent: AdminEvent = {
  title: "",
  short_description: "",
  full_description: "",
  event_date: "",
  start_time: "19:00",
  end_time: "23:00",
  occupancy: "low",
  price: "",
  event_type: "знакомство",
  event_type_icon: "Users",
  image_url: "",
  is_visible: true,
  bath_name: "",
  bath_address: "",
  description: "",
  program: [],
  rules: [],
  price_amount: 0,
  price_label: "",
  total_spots: 10,
  spots_left: 10,
  featured: false,
};