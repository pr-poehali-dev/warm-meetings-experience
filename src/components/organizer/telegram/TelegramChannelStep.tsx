import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

const BOT_URL = "https://t.me/SparcomEventsBot";
const BOT_NAME = "@SparcomEventsBot";

interface Props {
  checking: boolean;
  copied: boolean;
  onCheck: () => void;
  onCopy: (text: string) => void;
}

export default function TelegramChannelStep({ checking, copied, onCheck, onCopy }: Props) {
  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base flex-shrink-0">
            2
          </div>
          <div>
            <div className="font-semibold">Подключите ваш Telegram-канал или группу</div>
            <div className="text-xs text-muted-foreground">Сюда будут приходить анонсы событий</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
          <div className="flex gap-2">
            <Icon name="Info" size={15} className="flex-shrink-0 mt-0.5 text-blue-500" />
            <p>Бот должен быть администратором вашего канала — иначе он не сможет туда писать. Не переживайте, это стандартная процедура для всех Telegram-ботов.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
              <span className="text-sm font-medium">Добавьте бота администратором в канал или группу</span>
            </div>
            <div className="p-3 space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Для канала:</p>
                <div className="space-y-1 text-sm text-muted-foreground pl-2">
                  <p>1. Зайдите в канал → Настройки → Администраторы</p>
                  <p>2. Нажмите «Добавить администратора»</p>
                  <p>3. Найдите <span className="font-mono font-medium text-foreground">{BOT_NAME}</span> и добавьте</p>
                  <p>4. Убедитесь, что есть право <span className="font-medium text-foreground">«Публикация сообщений»</span></p>
                </div>
              </div>
              <div className="border-t pt-2 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Для группы:</p>
                <div className="space-y-1 text-sm text-muted-foreground pl-2">
                  <p>Просто пригласите бота в группу как обычного участника</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
              <span className="text-sm font-medium">Откройте бота и отправьте команду /add</span>
            </div>
            <div className="p-3 space-y-2">
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href={`${BOT_URL}?start=add`} target="_blank" rel="noopener noreferrer">
                  <Icon name="ExternalLink" size={15} />
                  Открыть {BOT_NAME}
                </a>
              </Button>
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 font-mono text-sm">
                <span className="flex-1 font-semibold">/add</span>
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onCopy("/add")}>
                  <Icon name={copied ? "Check" : "Copy"} size={12} className={copied ? "text-green-600" : ""} />
                </Button>
              </div>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
              <span className="text-sm font-medium">Перешлите боту любое сообщение из вашего канала</span>
            </div>
            <div className="p-3 space-y-2">
              <p className="text-sm text-muted-foreground">
                Бот поймёт, какой это канал, и сразу пришлёт туда тестовое сообщение для проверки.
              </p>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-xs text-amber-800 flex gap-2">
                <Icon name="AlertCircle" size={13} className="flex-shrink-0 mt-0.5 text-amber-500" />
                <span>Если в канале ещё нет сообщений — сначала напишите там хоть что-нибудь, потом перешлите боту.</span>
              </div>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
              <span className="text-sm font-medium">Вернитесь и нажмите кнопку проверки</span>
            </div>
            <div className="p-3">
              <Button onClick={onCheck} disabled={checking} className="w-full gap-2">
                {checking
                  ? <><Icon name="Loader2" size={15} className="animate-spin" /> Проверяю...</>
                  : <><Icon name="RefreshCw" size={15} /> Я подключил канал — проверить</>
                }
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
