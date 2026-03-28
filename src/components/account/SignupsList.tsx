import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { UserSignup } from "@/lib/user-api";
import StatusBadge from "@/components/account/StatusBadge";

interface SignupsListProps {
  signups: UserSignup[];
  signupsLoading: boolean;
}

export default function SignupsList({ signups, signupsLoading }: SignupsListProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Мои записи</CardTitle>
      </CardHeader>
      <CardContent>
        {signupsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : signups.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="Calendar" size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">У вас пока нет записей на встречи</p>
            <Link to="/events">
              <Button variant="outline" size="sm" className="mt-4">
                Посмотреть встречи
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {signups.map((signup) => (
              <Link
                key={signup.id}
                to={`/events/${signup.event_slug}`}
                className="block"
              >
                <div className="flex gap-4 p-4 rounded-lg border hover:bg-accent/5 transition-colors">
                  {signup.image_url && (
                    <img
                      src={signup.image_url}
                      alt={signup.event_title}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium truncate">{signup.event_title}</h3>
                      <StatusBadge status={signup.status} />
                    </div>
                    <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Icon name="Calendar" size={14} />
                        <span>{signup.event_date}, {signup.start_time} — {signup.end_time}</span>
                      </div>
                      {signup.bath_name && (
                        <div className="flex items-center gap-1.5">
                          <Icon name="MapPin" size={14} />
                          <span className="truncate">{signup.bath_name}{signup.bath_address ? `, ${signup.bath_address}` : ""}</span>
                        </div>
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