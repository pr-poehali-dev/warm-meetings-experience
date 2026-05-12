import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Forbidden from "@/pages/Forbidden";

interface RoleGuardProps {
  role: string | string[];
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RoleGuard({ role, children, redirectTo }: RoleGuardProps) {
  const { user, loading, hasRole } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  const roles = Array.isArray(role) ? role : [role];
  const hasAccess = roles.includes("auth") || roles.some((r) => hasRole(r));

  if (!hasAccess) {
    if (redirectTo) return <Navigate to={redirectTo} replace />;
    const displayRoles = roles.filter(r => r !== "auth");
    return <Forbidden requiredRole={displayRoles.length > 0 ? displayRoles : undefined} />;
  }

  return <>{children}</>;
}