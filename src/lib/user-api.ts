import { request as authRequest, authenticatedRequest as profileRequest } from "@/lib/http";

const USER_AUTH_API = "https://functions.poehali.dev/d5d9f568-ba92-4605-9b95-646ba409fd8d";
const USER_PROFILE_API = "https://functions.poehali.dev/5322ffd0-7079-40ce-9d4e-8d7fee29624c";

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  telegram?: string;
  vk_id?: string | null;
  has_password?: boolean;
  totp_enabled?: boolean;
  created_at: string;
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

  totpSetup: (): Promise<{ secret: string; provisioning_uri: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=totp-setup`, { method: "POST" }),

  totpVerify: (code: string): Promise<{ message: string; backup_codes: string[] }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=totp-verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }),

  totpDisable: (data: { password?: string; code?: string }): Promise<{ message: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=totp-disable`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),

  exportMyData: (): Promise<{ data: Record<string, unknown> }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=my-data`),
};

export const userAuthApi2FA = {
  verify2FA: (pending_token: string, code: string) =>
    authRequest(`${USER_AUTH_API}/?action=verify_2fa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pending_token, code }) }),
};