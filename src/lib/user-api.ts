import { request as authRequest, authenticatedRequest as profileRequest } from "@/lib/http";

const USER_AUTH_API = "https://functions.poehali.dev/d5d9f568-ba92-4605-9b95-646ba409fd8d";
const USER_PROFILE_API = "https://functions.poehali.dev/5322ffd0-7079-40ce-9d4e-8d7fee29624c";

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  telegram?: string;
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
  register: (data: { email: string; name: string; phone: string; password: string; consent_pd: boolean }) =>
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

  updateProfile: (data: { name?: string; phone?: string; telegram?: string }): Promise<{ user: User }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=profile`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),

  getSignups: (): Promise<{ signups: UserSignup[] }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=signups`),

  changePassword: (current_password: string, new_password: string): Promise<{ message: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=password`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_password, new_password }) }),

  deleteAccount: (password: string): Promise<{ message: string }> =>
    profileRequest(`${USER_PROFILE_API}/?resource=delete-account`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }),
};