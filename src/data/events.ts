import { EventFromAPI } from "@/lib/api";

export type EventType = string;

export interface EventItem {
  id?: number;
  slug: string;
  title: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  type: EventType;
  typeIcon: string;
  bathName: string;
  bathAddress: string;
  image: string;
  description: string;
  fullDescription: string;
  program: string[];
  rules: string[];
  price: number;
  priceLabel: string;
  totalSpots: number;
  spotsLeft: number;
  featured: boolean;
  isVisible?: boolean;
}

export const EVENT_TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  "парение": { color: "text-emerald-800", bg: "bg-emerald-100" },
  "знакомства": { color: "text-blue-800", bg: "bg-blue-100" },
  "знакомство": { color: "text-blue-800", bg: "bg-blue-100" },
  "свидания": { color: "text-pink-800", bg: "bg-pink-100" },
  "свидание": { color: "text-pink-800", bg: "bg-pink-100" },
  "практика": { color: "text-amber-800", bg: "bg-amber-100" },
  "мастер-класс": { color: "text-violet-800", bg: "bg-violet-100" },
  "обучение": { color: "text-violet-800", bg: "bg-violet-100" },
  "встреча": { color: "text-teal-800", bg: "bg-teal-100" },
  "вечеринка": { color: "text-orange-800", bg: "bg-orange-100" },
};

const DEFAULT_TYPE_COLORS = { color: "text-gray-800", bg: "bg-gray-100" };

export function getTypeColors(type: string) {
  return EVENT_TYPE_COLORS[type.toLowerCase()] || DEFAULT_TYPE_COLORS;
}

export function mapApiEvent(e: EventFromAPI): EventItem {
  return {
    id: e.id,
    slug: e.slug || `event-${e.id}`,
    title: e.title,
    date: e.event_date,
    timeStart: e.start_time?.slice(0, 5) || "19:00",
    timeEnd: e.end_time?.slice(0, 5) || "23:00",
    type: e.event_type || "знакомство",
    typeIcon: e.event_type_icon || "Users",
    bathName: e.bath_name || "",
    bathAddress: e.bath_address || "",
    image: e.image_url || "",
    description: e.short_description || e.description || "",
    fullDescription: e.full_description || e.description || "",
    program: e.program || [],
    rules: e.rules || [],
    price: e.price_amount || 0,
    priceLabel: e.price_label || e.price || "",
    totalSpots: e.total_spots || 0,
    spotsLeft: e.spots_left || 0,
    featured: e.featured || false,
    isVisible: e.is_visible,
  };
}

export const BATH_NAMES = [
  "Высота 30",
  "Сандуны",
  "Варшавские бани",
  "Баня на Пресне",
];
