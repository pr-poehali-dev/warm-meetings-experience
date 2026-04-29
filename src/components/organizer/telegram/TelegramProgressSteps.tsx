import Icon from "@/components/ui/icon";
import { OrgNotifySettings } from "@/lib/organizer-api";

interface Props {
  step1Done: boolean;
  step2Done: boolean;
  tgChannelsCount: number;
  notifySettings: OrgNotifySettings | null;
}

export default function TelegramProgressSteps({ step1Done, step2Done, tgChannelsCount, notifySettings }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${step1Done ? "border-green-200 bg-green-50" : "border-border bg-muted/30"}`}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${step1Done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
          {step1Done ? <Icon name="Check" size={16} /> : "1"}
        </div>
        <div className="min-w-0">
          <div className={`text-xs font-semibold ${step1Done ? "text-green-700" : "text-foreground"}`}>
            {step1Done ? "Аккаунт привязан" : "Привязать аккаунт"}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {step1Done
              ? (notifySettings?.telegram_username
                  ? `@${notifySettings.telegram_username}`
                  : notifySettings?.telegram_first_name || "Готово ✓")
              : "Нужно сделать"}
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${step2Done ? "border-green-200 bg-green-50" : "border-border bg-muted/30"}`}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${step2Done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
          {step2Done ? <Icon name="Check" size={16} /> : "2"}
        </div>
        <div className="min-w-0">
          <div className={`text-xs font-semibold ${step2Done ? "text-green-700" : "text-foreground"}`}>
            {step2Done ? `Каналов: ${tgChannelsCount}` : "Добавить канал"}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {step2Done ? "Готово ✓" : "После шага 1"}
          </div>
        </div>
      </div>
    </div>
  );
}
