import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { UserSignup } from "@/lib/user-api";
import StatusBadge from "@/components/account/StatusBadge";

interface SignupsListProps {
  signups: UserSignup[];
  signupsLoading: boolean;
  title?: string;
  emptyIcon?: string;
  emptyText?: string;
  showEventsLink?: boolean;
}

export default function SignupsList({
  signups,
  signupsLoading,
  title = "Моё присутствие",
  emptyIcon = "Calendar",
  emptyText = "Пока не запланировано ни одного события",
  showEventsLink = false,
}: SignupsListProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {signupsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : signups.length === 0 ? (
          <div className="text-center py-6">
            <Icon
              name={emptyIcon as "Calendar"}
              size={36}
              className="mx-auto text-muted-foreground/30 mb-2"
            />
            {emptyText && (
              <p className="text-sm text-muted-foreground">{emptyText}</p>
            )}
            {showEventsLink && (
              <Link to="/events">
                <Button variant="outline" size="sm" className="mt-3">
                  Можно присоединиться
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {signups.map((signup) => (
              <Link
                key={signup.id}
                to={`/events/${signup.event_slug}`}
                className="block"
              >
                <div className="flex gap-3 p-3 rounded-xl border hover:bg-accent/5 transition-colors">
                  {signup.image_url && (
                    <img
                      src={signup.image_url}
                      alt={signup.event_title}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium leading-snug truncate">
                        {signup.event_title}
                      </h3>
                      <StatusBadge status={signup.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Icon name="Calendar" size={12} />
                        {signup.event_date}, {signup.start_time}
                      </span>
                      {signup.bath_name && (
                        <span className="flex items-center gap-1 truncate max-w-[160px]">
                          <Icon name="MapPin" size={12} />
                          {signup.bath_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}