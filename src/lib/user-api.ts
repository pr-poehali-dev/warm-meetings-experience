import { request as authRequest, authenticatedRequest as profileRequest } from "@/lib/http";

const USER_AUTH_API = "https://functions.poehali.dev/d5d9f568-ba92-4605-9b95-646ba409fd8d";
const USER_PROFILE_API = "https://functions.poehali.dev/5322ffd0-7079-40ce-9d4e-8d7fee29624c";
const VK_NOTIFY_API = "https://functions.poehali.dev/d80d1556-27a6-4477-b864-c621e0b9eaf7";

export interface UserRole {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  status: string;
  verified_at?: string;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  telegram?: string;
  vk_id?: string | null;
  yandex_id?: string | null;
  has_password?: boolean;
  totp_enabled?: boolean;
  email_verified?: boolean;
  created_at: string;
  avatar_url?: string | null;
  roles?: UserRole[];
}

export interface UserSignup {
  id: number;
  event_id: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
  event_title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  bath_name: string;
  bath_address: string;
  event_slug: string;
  image_url: string;
}

export const userAuthApi = {
  register: (data: { email: string; name: string; phone: string; password: string; consent_pd: boolean; consent_photo?: string | null }) =>
    authRequest(`${USER_AUTH_API}/?action=register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    authRequest(`${USER_AUTH_API}/?action=login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),

  forgot: (email: string) =>
    authRequest(`${USER_AUTH_API}/?action=forgot`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }),

  reset: (token: string, password: string) =>
    authRequest(`${USER_AUTH_API}/?action=reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }),

  check: (token: string) =>
    authRequest(`${USER_AUTH_API}/?action=check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }),

  logout: (token: string) =>
    authRequest(`${USER_AUTH_API}/?action=logout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }),
};

export const userProfileApi = {
  getProfile: (): Promise<{ user: User }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=profile`),

  updateProfile: (data: { name?: string; phone?: string; telegram?: string; email?: string }): Promise<{ user: User }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=profile`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),

  getSignups: (): Promise<{ signups: UserSignup[] }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=signups`),

  changePassword: (current_password: string, new_password: string): Promise<{ message: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=password`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_password, new_password }) }),

  deleteAccount: (data: { password?: string; confirm_text?: string }): Promise<{ message: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=delete-account`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),

  linkVk: (vk_id: string, access_token: string): Promise<{ message: string; vk_id: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=link-vk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vk_id, access_token }) }),

  unlinkVk: (): Promise<{ message: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=link-vk`, { method: "DELETE" }),

  linkYandex: (yandex_id: string, access_token: string): Promise<{ message: string; yandex_id: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=link-yandex`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ yandex_id, access_token }) }),

  unlinkYandex: (): Promise<{ message: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=link-yandex`, { method: "DELETE" }),

  totpSetup: (): Promise<{ secret: string; provisioning_uri: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=totp-setup`, { method: "POST" }),

  totpVerify: (code: string): Promise<{ message: string; backup_codes: string[] }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=totp-verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }),

  totpDisable: (data: { password?: string; code?: string }): Promise<{ message: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=totp-disable`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),

  exportMyData: (): Promise<{ data: Record<string, unknown> }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=my-data`),

  sendVerifyEmail: (): Promise<{ message: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=send-verify`, { method: "POST" }),

  verifyEmail: (token: string): Promise<{ message: string }> =>
    authRequest(`${USER_PROFILE_API}/?resource=verify-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }),

  getFavorites: (): Promise<{ favorites: FavoriteItem[] }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=favorites`),

  addFavorite: (item_type: string, item_id: number): Promise<{ ok: boolean }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=favorites`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item_type, item_id }) }),

  removeFavorite: (item_type: string, item_id: number): Promise<{ ok: boolean }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=favorites`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item_type, item_id }) }),

  getWallet: (): Promise<{ wallet_balance: number; bonus_balance: number; transactions: WalletTransaction[] }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=wallet`),

  getReferrals: (): Promise<{ referral_code: string; invited: ReferralInvite[]; total_invited: number; total_bonuses_earned: number }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=referrals`),
};

export interface FavoriteItem {
  id: number;
  item_type: "bath" | "master" | "event";
  item_id: number;
  name: string;
  slug: string;
  image?: string;
  subtitle?: string;
  created_at: string;
}

export interface WalletTransaction {
  id: number;
  type: "deposit" | "withdrawal" | "bonus" | "cashback" | "fee" | "refund";
  amount: number;
  description?: string;
  ref_type?: string;
  ref_id?: number;
  created_at: string;
}

export interface ReferralInvite {
  name: string;
  created_at: string;
  bonus_paid: boolean;
}

export interface LoginChallenge {
  requires_2fa: true;
  method: "totp" | "email" | "vk" | "yandex";
  pending_token: string;
  email_masked?: string | null;
  has_vk?: boolean;
  has_yandex?: boolean;
}

export const userAuthApi2FA = {
  verify2FA: (pending_token: string, code: string) =>
    authRequest(`${USER_AUTH_API}/?action=verify_2fa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pending_token, code }) }),

  loginVerifyEmail: (pending_token: string, code: string): Promise<{ user: User; token: string; expires_at: string }> =>
    authRequest(`${USER_AUTH_API}/?action=login_2fa_verify_email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pending_token, code }) }),

  loginResendEmail: (pending_token: string): Promise<{ message: string; email_masked: string; code_ttl_minutes: number }> =>
    authRequest(`${USER_AUTH_API}/?action=login_2fa_resend_email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pending_token }) }),

  loginStartOAuth: (pending_token: string, provider: "vk" | "yandex"): Promise<{ auth_url: string; state: string; code_verifier?: string; provider: "vk" | "yandex" }> =>
    authRequest(`${USER_AUTH_API}/?action=login_2fa_start_oauth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pending_token, provider }) }),

  loginVerifyOAuth: (params: { pending_token: string; provider: "vk" | "yandex"; code: string; state: string; code_verifier?: string; device_id?: string }): Promise<{ user: User; token: string; expires_at: string }> =>
    authRequest(`${USER_AUTH_API}/?action=login_2fa_verify_oauth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) }),
};

export interface Login2FAStatus {
  enabled: boolean;
  method: "email" | "vk" | "yandex" | null;
  explicit_method: "email" | "vk" | "yandex" | null;
  mandatory: boolean;
  vk_linked: boolean;
  yandex_linked: boolean;
  totp_enabled: boolean;
}

export interface ChannelPrefs {
  notify_service: boolean;
  notify_reminders: boolean;
  notify_marketing: boolean;
  notify_booking: boolean;
  notify_urgent: boolean;
}

export interface ChannelInfo {
  connected: boolean;
  active: boolean;
  allowed?: boolean;
  value?: string | null;
  prefs: ChannelPrefs;
}

export interface NotificationChannels {
  email: ChannelInfo;
  vk: ChannelInfo;
  telegram: ChannelInfo;
  sms: ChannelInfo;
}

export const notificationsApi = {
  getChannels: (): Promise<{ channels: NotificationChannels }> =>
    profileRequest(`${VK_NOTIFY_API}/?action=channels`),

  setChannel: (channel: string, active: boolean): Promise<{ ok: boolean }> =>
    profileRequest(`${VK_NOTIFY_API}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_channel", channel, active }) }),

  setPrefs: (channel: string, prefs: ChannelPrefs): Promise<{ ok: boolean }> =>
    profileRequest(`${VK_NOTIFY_API}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_prefs", channel, ...prefs }) }),

  allowVk: (allow: boolean): Promise<{ ok: boolean }> =>
    profileRequest(`${VK_NOTIFY_API}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "allow_vk", allow }) }),
};

export const loginSecurityApi = {
  get: (): Promise<Login2FAStatus> =>
    profileRequest(`${USER_PROFILE_API}/?resource=login-2fa`),

  set: (method: "email" | "vk" | "yandex", password: string): Promise<{ enabled: boolean; method: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=login-2fa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method, password }) }),

  disable: (password: string): Promise<{ enabled: boolean; method: null }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=login-2fa`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }),
};