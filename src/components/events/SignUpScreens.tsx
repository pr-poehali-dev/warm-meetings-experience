import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

interface SuccessScreenProps {
  email: string;
  onClose: () => void;
}

export function SignUpSuccessScreen({ email, onClose }: SuccessScreenProps) {
  return (
    <div className="px-6 py-10 text-center space-y-4">
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
  onClose: () => void;
}

export function SignUpAlreadyRegisteredScreen({
  eventTitle,
  dateLabel,
  timeLabel,
  bathName,
  onClose,
}: AlreadyRegisteredScreenProps) {
  return (
    <div className="px-6 py-10 text-center space-y-4">
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
          {bathName && <span className="block mt-0.5">{bathName}</span>}
        </p>
      )}
      <Button className="rounded-xl gap-2 w-full" onClick={onClose}>
        <Icon name="Check" size={16} />
        Понятно
      </Button>
    </div>
  );
}
