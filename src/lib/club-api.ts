import { request } from "@/lib/http";

const CLUB_API = "https://functions.poehali.dev/47ec3bfb-7ae5-4b98-bafa-e8587fd0cc9b";

export interface DonateRequest {
  amount: number;
  is_anonymous?: boolean;
  share_stats?: boolean;
  source?: string;
  message?: string;
  guest_name?: string;
  guest_email?: string;
  guest_contact?: string;
  success_url?: string;
  fail_url?: string;
}

export interface DonateResponse {
  donation_id: number;
  amount: number;
  payment_url: string | null;
  has_payment: boolean;
}

export interface DonationItem {
  id: number;
  amount: number;
  status: "pending" | "succeeded" | "failed" | "refunded";
  source: string | null;
  is_anonymous: boolean;
  created_at: string | null;
  paid_at: string | null;
}

export interface MyDonationsResponse {
  items: DonationItem[];
  total_amount: number;
  total_count: number;
}

export interface TopDonor {
  id: number;
  amount: number;
  paid_at: string | null;
  name: string;
}

export interface ClubStats {
  total_amount: number;
  total_count: number;
  supporters_count: number;
}

export const clubApi = {
  donate: (data: DonateRequest): Promise<DonateResponse> =>
    request(`${CLUB_API}/?resource=donate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  mine: (): Promise<MyDonationsResponse> =>
    request(`${CLUB_API}/?resource=mine`),

  top: (): Promise<{ items: TopDonor[] }> =>
    request(`${CLUB_API}/?resource=top`),

  stats: (): Promise<ClubStats> =>
    request(`${CLUB_API}/?resource=stats`),
};
