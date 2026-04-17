import { authenticatedRequest as rolesRequest } from "@/lib/http";

const ROLES_API = "https://functions.poehali.dev/ccd16473-f2d9-40af-a82e-4e348402aa29";

export interface RoleRequirement {
  id: number;
  type: string;
  value: number;
  description: string;
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  requirements: RoleRequirement[] | null;
}

export interface UserRole {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  status: string;
  verified_at: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface RoleApplication {
  id: number;
  status: string;
  message: string;
  admin_comment: string | null;
  created_at: string;
  reviewed_at: string | null;
  role_name: string;
  role_slug: string;
  role_icon: string;
}

export interface RequirementProgress {
  id: number;
  type: string;
  required_value: number;
  description: string;
  progress: number;
  completed: boolean;
}

export interface RoleProgress {
  role_id: number;
  role_name: string;
  role_slug: string;
  role_icon: string;
  requirements: RequirementProgress[];
  total: number;
  completed: number;
}

export interface Badge {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
  earned_at: string | null;
}

export interface ApplyResponse {
  application: { id: number; status: string; created_at?: string };
  requires_email_code?: boolean;
  email_masked?: string;
  code_ttl_minutes?: number;
  message: string;
}

export interface VerifyEmailCodeResponse {
  application_id: number;
  status: string;
  message: string;
  attempts_left?: number;
}

export interface StartOAuth2FAResponse {
  provider: "vk" | "yandex";
  auth_url: string;
  state: string;
  code_verifier?: string;
  redirect_uri: string;
}

export interface VerifyOAuth2FAResponse {
  application_id: number;
  status: string;
  linked: boolean;
  message: string;
}

export const rolesApi = {
  getAllRoles: (): Promise<{ roles: Role[] }> =>
    rolesRequest(`${ROLES_API}/?resource=all-roles`),

  getMyRoles: (): Promise<{ roles: UserRole[]; applications: RoleApplication[] }> =>
    rolesRequest(`${ROLES_API}/?resource=my-roles`),

  getProgress: (): Promise<{ progress: RoleProgress[] }> =>
    rolesRequest(`${ROLES_API}/?resource=progress`),

  getBadges: (): Promise<{ badges: Badge[] }> =>
    rolesRequest(`${ROLES_API}/?resource=badges`),

  applyForRole: (role_slug: string, message: string, portfolio_data?: Record<string, unknown>): Promise<ApplyResponse> =>
    rolesRequest(`${ROLES_API}/?resource=apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_slug, message, portfolio_data }),
    }),

  verifyEmailCode: (application_id: number, code: string): Promise<VerifyEmailCodeResponse> =>
    rolesRequest(`${ROLES_API}/?resource=verify-email-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id, code }),
    }),

  resendEmailCode: (application_id: number): Promise<{ message: string; email_masked: string; code_ttl_minutes: number }> =>
    rolesRequest(`${ROLES_API}/?resource=resend-email-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id }),
    }),

  startOAuth2FA: (application_id: number, provider: "vk" | "yandex"): Promise<StartOAuth2FAResponse> =>
    rolesRequest(`${ROLES_API}/?resource=start-oauth-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id, provider }),
    }),

  verifyOAuth2FA: (params: {
    application_id: number;
    provider: "vk" | "yandex";
    code: string;
    code_verifier?: string;
    device_id?: string;
  }): Promise<VerifyOAuth2FAResponse> =>
    rolesRequest(`${ROLES_API}/?resource=verify-oauth-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }),

  switchRole: (role_slug: string): Promise<{ active_role: { id: number; slug: string; name: string } }> =>
    rolesRequest(`${ROLES_API}/?resource=switch-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_slug }),
    }),
};

export default rolesApi;