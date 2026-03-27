import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { rolesApi } from "@/lib/roles-api";
import Icon from "@/components/ui/icon";
import MasterCalendar from "@/components/admin/MasterCalendar";

const MyCalendar = () => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { roles } = await rolesApi.getMyRoles();
        const isParmaster = roles.some(
          (r) => r.slug === "parmaster" && r.status === "active"
        );
        setHasAccess(isParmaster);
      } catch {
        setHasAccess(false);
      }
    };
    checkRole();
  }, []);

  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-16">
        <Icon name="Lock" size={40} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Календарь доступен для пармастеров</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Получите роль «Пармастер», чтобы управлять расписанием
        </p>
      </div>
    );
  }

  if (!user) return null;

  return <MasterCalendar masterId={user.id} />;
};

export default MyCalendar;
