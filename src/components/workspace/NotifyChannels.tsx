import Icon from "@/components/ui/icon";

export default function NotifyChannels() {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-sm">Каналы уведомлений</p>
        <p className="text-xs text-muted-foreground mt-0.5">Уведомления отправляются на email, указанный в профиле</p>
      </div>
      <div className="flex items-center gap-3 bg-card border rounded-2xl p-4">
        <Icon name="Mail" size={16} className="text-primary flex-shrink-0" />
        <div>
          <div className="font-medium text-sm">Email</div>
          <div className="text-xs text-muted-foreground">Основной канал уведомлений</div>
        </div>
        <div className="ml-auto text-xs text-green-600 font-medium">Активен</div>
      </div>
    </div>
  );
}
