import { Card, CardContent } from "@/components/ui/card";
import { UserRole } from "@/lib/roles-api";

interface TrustScoreProps {
  roles: UserRole[];
}

export default function TrustScore({ roles }: TrustScoreProps) {
  const activeRoles = roles.filter((r) => r.status === "active");

  if (activeRoles.length === 0) return null;

  const overallRating = 4.7;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Общий рейтинг</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">{overallRating}</span>
              <span className="text-amber-400 text-lg">{"★".repeat(Math.round(overallRating))}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {activeRoles.map((role) => (
              <span
                key={role.slug}
                className="w-8 h-8 flex items-center justify-center bg-primary/5 rounded-full text-sm"
                title={role.name}
              >
                {role.icon}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
