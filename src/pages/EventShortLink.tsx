import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { eventsApi } from "@/lib/api";

export default function EventShortLink() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) {
      navigate("/events", { replace: true });
      return;
    }
    eventsApi.getByShortCode(code)
      .then((data) => {
        navigate(`/events/${data.slug}`, { replace: true });
      })
      .catch(() => {
        navigate("/events", { replace: true });
      });
  }, [code]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground mx-auto" />
        <p className="text-muted-foreground text-sm">Открываю событие...</p>
      </div>
    </div>
  );
}
