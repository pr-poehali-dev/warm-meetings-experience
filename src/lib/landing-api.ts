import { request, authenticatedRequest } from "@/lib/http";

const LANDING_API = "https://functions.poehali.dev/369c5072-7791-44e2-b3c9-a7c4016a67a1";

export type LandingBlockId =
  | "avatar_name"
  | "about_text"
  | "services"
  | "portfolio"
  | "reviews"
  | "contacts"
  | "map"
  | "cta"
  | "social";

export const ALL_BLOCKS: { id: LandingBlockId; label: string; icon: string; desc: string }[] = [
  { id: "avatar_name", label: "Аватар и имя", icon: "User", desc: "Фото, имя, специализация" },
  { id: "about_text",  label: "О себе",       icon: "FileText", desc: "Текст до 1000 символов" },
  { id: "services",    label: "Услуги",       icon: "Sparkles", desc: "Прайс-лист услуг" },
  { id: "portfolio",   label: "Портфолио",    icon: "Image", desc: "До 10 фото и видео-ссылок" },
  { id: "reviews",     label: "Отзывы",       icon: "Star", desc: "Отзывы клиентов" },
  { id: "contacts",    label: "Контакты",     icon: "Phone", desc: "Телефон, email, мессенджеры" },
  { id: "map",         label: "Карта",        icon: "MapPin", desc: "Адрес и карта проезда" },
  { id: "cta",         label: "Кнопка-призыв",icon: "MousePointerClick", desc: "Кнопка «Записаться» + форма" },
  { id: "social",      label: "Соц. сети",    icon: "Share2", desc: "Иконки соцсетей" },
];

export interface LandingContacts {
  phone?: string;
  email?: string;
  telegram?: string;
  whatsapp?: string;
  vk?: string;
  instagram?: string;
  youtube?: string;
}

export interface LandingPortfolioItem {
  url: string;
  type: "image" | "video";
  caption?: string;
}

export interface LandingCustomData {
  blocks?: LandingBlockId[];
  hidden_blocks?: LandingBlockId[];
  display_name?: string;
  tagline?: string;
  avatar_url?: string;
  about_text?: string;
  portfolio?: LandingPortfolioItem[];
  contacts?: LandingContacts;
  map_address?: string;
  cta_title?: string;
  cta_description?: string;
  social?: LandingContacts;
  hidden_service_ids?: number[];
}

export interface LandingPage {
  id: number;
  user_id: number;
  slug: string;
  enabled: boolean;
  theme: string;
  custom_data: LandingCustomData;
  visits: number;
  cta_clicks: number;
  created_at: string;
  updated_at: string;
}

export interface PublicLandingResponse {
  landing: LandingPage;
  owner: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    telegram?: string;
    avatar_url?: string;
  } | null;
  master: {
    id: number;
    slug: string;
    name: string;
    tagline?: string;
    bio?: string;
    avatar?: string;
    rating?: string | number;
    reviews_count?: number;
  } | null;
  services: { id: number; name: string; description?: string; duration_minutes?: number; price?: string | number }[];
  reviews: { id: number; client_name: string; rating: number; text: string; created_at: string }[];
  baths: { id: number; name: string; address?: string; lat?: number; lng?: number; photos?: { url?: string }[] }[];
}

export const landingApi = {
  checkSlug: (slug: string): Promise<{ available: boolean; slug: string; error?: string }> => {
    const token = localStorage.getItem("user_token");
    return request(`${LANDING_API}/?resource=slug-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-Session-Token": token } : {}),
      },
      body: JSON.stringify({ slug }),
    });
  },

  getMy: (): Promise<{ landing: LandingPage | null }> =>
    authenticatedRequest(`${LANDING_API}/?resource=settings`, { method: "GET" }),

  save: (payload: {
    slug?: string;
    enabled?: boolean;
    theme?: string;
    custom_data?: LandingCustomData;
  }): Promise<{ landing: LandingPage }> =>
    authenticatedRequest(`${LANDING_API}/?resource=settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  uploadPhoto: (fileBase64: string, filename: string): Promise<{ url: string; key: string }> =>
    authenticatedRequest(`${LANDING_API}/?resource=upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: fileBase64, filename }),
    }),

  getPublic: (slug: string): Promise<PublicLandingResponse> =>
    request(`${LANDING_API}/?resource=public&slug=${encodeURIComponent(slug)}`),

  sendLead: (slug: string, payload: { name: string; contact: string; message?: string }) =>
    request(`${LANDING_API}/?resource=lead&slug=${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  ctaClick: (slug: string) =>
    request(`${LANDING_API}/?resource=cta-click&slug=${encodeURIComponent(slug)}`, {
      method: "POST",
    }).catch(() => null),
};