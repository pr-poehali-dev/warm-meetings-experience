import Icon from "@/components/ui/icon";
import { OrgNotifySettings } from "@/lib/organizer-api";
import { TgChannel } from "@/lib/tg-publish-api";

interface Props {
  step1Done: boolean;
  step2Done: boolean;
  tgChannelsCount: number;
  notifySettings: OrgNotifySettings | null;
  channels?: TgChannel[];
}

export default function TelegramProgressSteps({ step1Done, step2Done, tgChannelsCount, notifySettings, channels = [] }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${step1Done ? "border-green-500/30 bg-green-500/10" : "border-border bg-muted/30"}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${step1Done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
            {step1Done ? <Icon name="Check" size={16} /> : "1"}
          </div>
          <div className="min-w-0">
            <div className={`text-xs font-semibold ${step1Done ? "text-green-700 dark:text-green-400" : "text-foreground"}`}>
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

        <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${step2Done ? "border-green-500/30 bg-green-500/10" : "border-border bg-muted/30"}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${step2Done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
            {step2Done ? <Icon name="Check" size={16} /> : "2"}
          </div>
          <div className="min-w-0">
            <div className={`text-xs font-semibold ${step2Done ? "text-green-700 dark:text-green-400" : "text-foreground"}`}>
              {step2Done ? `Каналов: ${tgChannelsCount}` : "Добавить канал"}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {step2Done ? "Готово ✓" : "После шага 1"}
            </div>
          </div>
        </div>
      </div>

      {channels.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          {channels.map((ch, i) => (
            <div
              key={ch.id}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-sm ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <Icon name={ch.chat_type === "channel" ? "Radio" : "Users"} size={13} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium truncate flex-1">{ch.chat_title || "Без названия"}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {ch.chat_type === "channel" ? "Канал" : "Группа"}
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}