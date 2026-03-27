import { useState, useEffect, useCallback } from "react";
import { signupsApi } from "@/lib/api";
import { masterBookingsApi } from "@/lib/master-calendar-api";

const CALCULATOR_API = "https://functions.poehali.dev/0d9ea640-f2f5-4e63-8633-db26b10decc8";
const ROLES_API = "https://functions.poehali.dev/ccd16473-f2d9-40af-a82e-4e348402aa29";
const MASTER_ID = 1;

export interface AdminBadges {
  events: number;
  calculator: number;
  master: number;
  community: number;
}

async function fetchAdminToken(): Promise<string | null> {
  return localStorage.getItem("admin_token");
}

export function useAdminBadges() {
  const [badges, setBadges] = useState<AdminBadges>({ events: 0, calculator: 0, master: 0, community: 0 });

  const refresh = useCallback(async () => {
    const token = await fetchAdminToken();

    const results = await Promise.allSettled([
      signupsApi.getAll(),
      fetch(`${CALCULATOR_API}?resource=bookings`).then((r) => r.json()),
      masterBookingsApi.getBookings(MASTER_ID, "pending"),
      token
        ? fetch(`${ROLES_API}/?resource=admin-applications`, {
            headers: { "X-Admin-Token": token },
          }).then((r) => r.json())
        : Promise.resolve({ applications: [] }),
    ]);

    const eventSignups = results[0].status === "fulfilled" ? results[0].value : [];
    const calcData = results[1].status === "fulfilled" ? results[1].value : {};
    const masterData = results[2].status === "fulfilled" ? results[2].value : {};
    const rolesData = results[3].status === "fulfilled" ? results[3].value : {};

    const eventsNew = Array.isArray(eventSignups)
      ? eventSignups.filter((s: { status: string }) => s.status === "new").length
      : 0;

    const calcBookings = calcData?.bookings ?? [];
    const calcNew = Array.isArray(calcBookings)
      ? calcBookings.filter((b: { status: string }) => b.status === "new").length
      : 0;

    const masterBookings = masterData?.bookings ?? [];
    const masterNew = Array.isArray(masterBookings) ? masterBookings.length : 0;

    const roleApps = rolesData?.applications ?? [];
    const rolesNew = Array.isArray(roleApps)
      ? roleApps.filter((a: { status: string }) => a.status === "pending").length
      : 0;

    setBadges({ events: eventsNew, calculator: calcNew, master: masterNew, community: rolesNew });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { badges, refresh };
}