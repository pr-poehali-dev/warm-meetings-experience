import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { OrgNotifySettings } from "@/lib/organizer-api";

const BOT_URL = "https://t.me/SparcomEventsBot";
const BOT_NAME = "@SparcomEventsBot";

interface Props {
  notifySettings: OrgNotifySettings | null;
}

export default function TelegramConnectedCard({ notifySettings }: Props) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Icon name="CheckCircle2" size={22} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-green-800">Всё настроено!</div>
            <div className="text-sm text-green-700">Бот активен и готов к работе</div>
          </div>
        </div>

        {notifySettings?.tg_linked && (
          <div className="flex items-center gap-3 bg-white rounded-xl border border-green-200 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-[#229ED9]/10 flex items-center justify-center shrink-0">
              <Icon name="Send" size={16} className="text-[#229ED9]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">
                {notifySettings.telegram_first_name || "Telegram"}
                {notifySettings.telegram_username && (
                  <span className="text-muted-foreground font-normal ml-1.5">@{notifySettings.telegram_username}</span>
                )}
              </p>
              {notifySettings.tg_linked_at && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Привязан {new Date(notifySettings.tg_linked_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            <Icon name="CheckCircle2" size={16} className="text-green-500 shrink-0" />
          </div>
        )}

        <div className="bg-white rounded-xl border border-green-200 p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Что происходит автоматически:</p>
          <div className="space-y-2">
            {[
              { icon: "Megaphone", text: "При публикации события — анонс уходит в ваш канал" },
              { icon: "Bell", text: "При новой записи — вы получаете уведомление в Telegram" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon name={item.icon as "Megaphone"} size={14} className="text-green-600 flex-shrink-0" />
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-green-200 p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Полезные команды в боте:</p>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { cmd: "/list", desc: "Список подключённых каналов" },
              { cmd: "/template", desc: "Изменить шаблон публикации" },
              { cmd: "/test", desc: "Отправить тестовый пост" },
              { cmd: "/remove", desc: "Отключить канал" },
            ].map((item) => (
              <div key={item.cmd} className="flex items-center gap-2 text-sm">
                <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono text-primary font-semibold">{item.cmd}</code>
                <span className="text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <Button variant="outline" className="w-full gap-2" asChild>
          <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
            <Icon name="ExternalLink" size={16} />
            Открыть {BOT_NAME}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
