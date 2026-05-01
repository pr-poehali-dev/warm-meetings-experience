import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface RoleGuardProps {
  role: string;
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RoleGuard({ role, children, redirectTo = "/" }: RoleGuardProps) {
  const { user, loading, hasRole } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (role !== "auth" && !hasRole(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
