import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface RoleGuardProps {
  role: string | string[];
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RoleGuard({ role, children, redirectTo = "/" }: RoleGuardProps) {
  const { user, loading, hasRole } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  const roles = Array.isArray(role) ? role : [role];
  const hasAccess = roles.includes("auth") || roles.some((r) => hasRole(r));

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}