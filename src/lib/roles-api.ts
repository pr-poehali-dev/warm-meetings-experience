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

async function rolesRequest(url: string, options?: RequestInit) {
  const token = localStorage.getItem("user_token");
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      "X-Session-Token": token || "",
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
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

  applyForRole: (role_slug: string, message: string, portfolio_data?: Record<string, unknown>): Promise<{ application: RoleApplication; message: string }> =>
    rolesRequest(`${ROLES_API}/?resource=apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_slug, message, portfolio_data }),
    }),

  switchRole: (role_slug: string): Promise<{ active_role: { id: number; slug: string; name: string } }> =>
    rolesRequest(`${ROLES_API}/?resource=switch-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_slug }),
    }),
};

export default rolesApi;
