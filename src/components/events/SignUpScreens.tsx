import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import EventMapView from "@/components/events/EventMapView";

interface SuccessScreenProps {
  email: string;
  onClose: () => void;
  bathName?: string;
  bathAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function SignUpSuccessScreen({ email, onClose, bathName, bathAddress, latitude, longitude }: SuccessScreenProps) {
  const hasMap = latitude != null && longitude != null;
  return (
    <div className="px-6 py-8 space-y-4">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Icon name="CheckCircle2" size={32} className="text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">Заявка отправлена!</h3>
          <p className="text-sm text-muted-foreground">
            Организатор получил вашу заявку и свяжется с вами для подтверждения.
          </p>
        </div>
        {email && (
          <p className="text-xs text-muted-foreground">
            Подтверждение отправлено на <span className="font-medium">{email}</span>
          </p>
        )}
      </div>

      {(bathName || bathAddress) && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Icon name="MapPin" size={14} className="text-primary mt-0.5 shrink-0" />
            <div>
              {bathName && <p className="text-sm font-medium">{bathName}</p>}
              {bathAddress && <p className="text-xs text-muted-foreground">{bathAddress}</p>}
            </div>
          </div>
          {hasMap && (
            <EventMapView lat={latitude!} lng={longitude!} label={bathName || bathAddress} />
          )}
        </div>
      )}

      <Button className="rounded-xl gap-2 w-full" onClick={onClose}>
        <Icon name="Check" size={16} />
        Готово
      </Button>
    </div>
  );
}

interface AlreadyRegisteredScreenProps {
  eventTitle: string;
  dateLabel: string | null;
  timeLabel: string | undefined;
  bathName?: string;
  bathAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  onClose: () => void;
}

export function SignUpAlreadyRegisteredScreen({
  eventTitle,
  dateLabel,
  timeLabel,
  bathName,
  bathAddress,
  latitude,
  longitude,
  onClose,
}: AlreadyRegisteredScreenProps) {
  const hasMap = latitude != null && longitude != null;
  return (
    <div className="px-6 py-8 space-y-4">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <Icon name="CalendarCheck" size={32} className="text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">Вы уже записаны!</h3>
          <p className="text-sm text-muted-foreground">
            Вы уже подали заявку на «{eventTitle}». Организатор свяжется с вами для подтверждения.
          </p>
        </div>
        {(dateLabel || timeLabel) && (
          <p className="text-xs text-muted-foreground">
            {dateLabel && <span>{dateLabel}</span>}
            {timeLabel && <span className="ml-1">в {timeLabel}</span>}
          </p>
        )}
      </div>

      {(bathName || bathAddress) && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Icon name="MapPin" size={14} className="text-primary mt-0.5 shrink-0" />
            <div>
              {bathName && <p className="text-sm font-medium">{bathName}</p>}
              {bathAddress && <p className="text-xs text-muted-foreground">{bathAddress}</p>}
            </div>
          </div>
          {hasMap && (
            <EventMapView lat={latitude!} lng={longitude!} label={bathName || bathAddress} />
          )}
        </div>
      )}

      <Button className="rounded-xl gap-2 w-full" onClick={onClose}>
        <Icon name="Check" size={16} />
        Понятно
      </Button>
    </div>
  );
}
