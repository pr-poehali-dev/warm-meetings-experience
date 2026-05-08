import { useState, useEffect, useCallback } from "react";
import { signupsApi } from "@/lib/api";
import { adminModerationRequest } from "@/lib/http";

const ORGANIZER_API = "https://functions.poehali.dev/730d60f4-a9cf-4f56-90d9-f48caaa9007d";
const CALCULATOR_API = "https://functions.poehali.dev/0d9ea640-f2f5-4e63-8633-db26b10decc8";
const ROLES_API = "https://functions.poehali.dev/ccd16473-f2d9-40af-a82e-4e348402aa29";
const SUPPORT_API = "https://functions.poehali.dev/a0a86024-792f-4be0-8a06-30173c46b07a";
const MEDIA_API = "https://functions.poehali.dev/c154b509-fa63-4739-b116-5773e82615a3";
const BLOG_API = "https://functions.poehali.dev/c4b3bf91-237b-43c6-be59-4e02e3f0a63e";
const MASTERS_API = "https://functions.poehali.dev/5e680421-cf43-4b07-abc1-8005b1b68de6";

export interface AdminBadges {
  events: number;
  calculator: number;
  community: number;
  moderation: number;
  support: number;
  videos: number;
  blog: number;
  masters: number;
}

export interface AdminInsights {
  badges: AdminBadges;
  loading: boolean;
  events: { id?: number; title: string; event_date: string; spots_left?: number; total_spots?: number; is_visible: boolean }[];
  highTickets: { id: number; subject: string; priority: string; status: string; updated_at: string }[];
  recentBookings: { id: number; status: string; created_at: string; name?: string; phone?: string; total_price?: number }[];
  pendingModerations: { type: string; title: string; meta?: string }[];
}

const EMPTY_BADGES: AdminBadges = {
  events: 0,
  calculator: 0,
  community: 0,
  moderation: 0,
  support: 0,
  videos: 0,
  blog: 0,
  masters: 0,
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function useAdminBadges() {
  const [badges, setBadges] = useState<AdminBadges>(EMPTY_BADGES);
  const [insights, setInsights] = useState<AdminInsights>({
    badges: EMPTY_BADGES,
    loading: true,
    events: [],
    highTickets: [],
    recentBookings: [],
    pendingModerations: [],
  });

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("admin_token");
    const adminH = token ? { "X-Admin-Token": token } : undefined;

    const results = await Promise.allSettled([
      signupsApi.getAll(),
      fetch(`${CALCULATOR_API}?resource=bookings`).then(safeJson),
      token
        ? fetch(`${ROLES_API}/?resource=admin-applications`, { headers: adminH }).then(safeJson)
        : Promise.resolve({ applications: [] }),
      adminModerationRequest(`${ORGANIZER_API}/?resource=moderation`).catch(() => []),
      token
        ? fetch(`${SUPPORT_API}?resource=admin-tickets`, { headers: adminH }).then(safeJson)
        : Promise.resolve({ tickets: [] }),
      token
        ? fetch(`${MEDIA_API}?videos=1&admin=1&status=pending`, { headers: adminH }).then(safeJson)
        : Promise.resolve({ videos: [] }),
      fetch(`${BLOG_API}?resource=admin&status=pending`).then(safeJson),
      token
        ? fetch(`${MASTERS_API}?admin=1&verified=false`, { headers: adminH }).then(safeJson)
        : Promise.resolve({ masters: [] }),
    ]);

    const eventSignups = results[0].status === "fulfilled" ? results[0].value : [];
    const calcData = results[1].status === "fulfilled" ? results[1].value : {};
    const rolesData = results[2].status === "fulfilled" ? results[2].value : {};
    const moderationData = results[3].status === "fulfilled" ? results[3].value : [];
    const supportData = results[4].status === "fulfilled" ? results[4].value : {};
    const videosData = results[5].status === "fulfilled" ? results[5].value : {};
    const blogData = results[6].status === "fulfilled" ? results[6].value : {};
    const mastersData = results[7].status === "fulfilled" ? results[7].value : {};

    const eventsNew = Array.isArray(eventSignups)
      ? eventSignups.filter((s: { status: string }) => s.status === "new").length
      : 0;

    const calcBookings: { status: string; created_at: string; id: number; name?: string; phone?: string; total_price?: number }[] =
      Array.isArray(calcData?.bookings) ? calcData.bookings : [];
    const calcNew = calcBookings.filter((b) => b.status === "new").length;

    const roleApps = rolesData?.applications ?? [];
    const rolesNew = Array.isArray(roleApps)
      ? roleApps.filter((a: { status: string }) => a.status === "pending").length
      : 0;

    const moderationNew = Array.isArray(moderationData) ? moderationData.length : 0;

    const tickets: { id: number; subject: string; priority: string; status: string; updated_at: string }[] =
      Array.isArray(supportData?.tickets) ? supportData.tickets : [];
    const ticketsOpen = tickets.filter((t) => t.status !== "closed").length;
    const highTickets = tickets
      .filter((t) => t.status !== "closed" && (t.priority === "high" || t.status === "open"))
      .sort((a, b) => (b.priority === "high" ? 1 : 0) - (a.priority === "high" ? 1 : 0))
      .slice(0, 5);

    const videosPending = Array.isArray(videosData?.videos) ? videosData.videos.length : 0;
    const blogPending = Array.isArray(blogData?.articles)
      ? blogData.articles.filter((a: { status: string }) => a.status === "pending").length
      : 0;
    const mastersList = Array.isArray(mastersData?.masters) ? mastersData.masters : [];
    const mastersUnverified = mastersList.filter(
      (m: { is_verified?: boolean }) => !m.is_verified
    ).length;

    const newBadges: AdminBadges = {
      events: eventsNew,
      calculator: calcNew,
      community: rolesNew,
      moderation: moderationNew,
      support: ticketsOpen,
      videos: videosPending,
      blog: blogPending,
      masters: mastersUnverified,
    };

    const recentBookings = calcBookings
      .filter((b) => b.status === "new")
      .slice(0, 5);

    const pendingModerations: { type: string; title: string; meta?: string }[] = [];
    if (Array.isArray(moderationData)) {
      moderationData.slice(0, 3).forEach((m: { title?: string; event_date?: string }) => {
        pendingModerations.push({
          type: "Событие",
          title: m.title || "Без названия",
          meta: m.event_date,
        });
      });
    }
    if (Array.isArray(blogData?.articles)) {
      blogData.articles
        .filter((a: { status: string }) => a.status === "pending")
        .slice(0, 3)
        .forEach((a: { title?: string }) => {
          pendingModerations.push({ type: "Статья", title: a.title || "Без названия" });
        });
    }
    if (Array.isArray(videosData?.videos)) {
      videosData.videos.slice(0, 3).forEach((v: { title?: string }) => {
        pendingModerations.push({ type: "Видео", title: v.title || "Без названия" });
      });
    }

    setBadges(newBadges);
    setInsights({
      badges: newBadges,
      loading: false,
      events: [],
      highTickets,
      recentBookings,
      pendingModerations,
    });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { badges, insights, refresh };
}
