import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

const BOT_URL = "https://t.me/SparcomEventsBot";
const BOT_NAME = "@SparcomEventsBot";

interface Props {
  code: string | null;
  loading: boolean;
  copied: boolean;
  checking: boolean;
  onGetCode: () => void;
  onCopy: (text: string) => void;
  onCheck: () => void;
}

function StepRow({ number, text }: { number: number; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
        {number}
      </span>
      <div className="text-sm text-muted-foreground">{text}</div>
    </div>
  );
}

export default function TelegramLinkStep({ code, loading, copied, checking, onGetCode, onCopy, onCheck }: Props) {
  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base flex-shrink-0">
            1
          </div>
          <div>
            <div className="font-semibold">Привяжите ваш Telegram-аккаунт</div>
            <div className="text-xs text-muted-foreground">Один раз — и бот будет знать, кто вы</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
          <div className="flex gap-2">
            <Icon name="Info" size={15} className="flex-shrink-0 mt-0.5 text-blue-500" />
            <p>Привязка нужна, чтобы бот знал — уведомления о новых записях отправлять именно вам, а не кому-то другому.</p>
          </div>
        </div>

        {!code ? (
          <>
            <div className="space-y-2">
              <StepRow number={1} text="Нажмите кнопку «Получить код» — появится одноразовый код" />
              <StepRow number={2} text={<>Откройте бота в Telegram: <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="text-primary font-medium underline">{BOT_NAME}</a></>} />
              <StepRow number={3} text="Отправьте боту команду /verify и ваш код — аккаунт привяжется автоматически" />
            </div>

            <Button onClick={onGetCode} disabled={loading} className="w-full gap-2" size="lg">
              {loading
                ? <><Icon name="Loader2" size={16} className="animate-spin" /> Генерирую код...</>
                : <><Icon name="Key" size={16} /> Получить код привязки</>
              }
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-center p-5 bg-muted rounded-2xl border-2 border-dashed">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Ваш код привязки</div>
              <div className="text-4xl font-mono font-bold tracking-[0.2em] text-foreground mb-2">{code}</div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600">
                <Icon name="Clock" size={12} />
                Действителен 10 минут
              </div>
            </div>

            <div className="space-y-3">
              <div className="border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                  <span className="text-sm font-medium">Откройте бота в Telegram</span>
                </div>
                <div className="p-3">
                  <Button variant="outline" className="w-full gap-2" asChild>
                    <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
                      <Icon name="ExternalLink" size={15} />
                      Открыть {BOT_NAME}
                    </a>
                  </Button>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                  <span className="text-sm font-medium">Скопируйте и отправьте боту эту команду</span>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 bg-muted rounded-lg p-3 font-mono text-sm">
                    <span className="flex-1 text-foreground font-semibold">/verify {code}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 flex-shrink-0"
                      onClick={() => onCopy(`/verify ${code}`)}
                    >
                      <Icon name={copied ? "Check" : "Copy"} size={14} className={copied ? "text-green-600" : ""} />
                      <span className="ml-1 text-xs">{copied ? "Скопировано" : "Скопировать"}</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 pl-1">
                    Вставьте эту команду в чат с ботом и нажмите отправить
                  </p>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                  <span className="text-sm font-medium">Вернитесь сюда и нажмите кнопку ниже</span>
                </div>
                <div className="p-3 space-y-2">
                  <Button onClick={onCheck} disabled={checking} variant="default" className="w-full gap-2">
                    {checking
                      ? <><Icon name="Loader2" size={15} className="animate-spin" /> Проверяю...</>
                      : <><Icon name="RefreshCw" size={15} /> Я отправил — проверить привязку</>
                    }
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground text-xs" onClick={onGetCode} disabled={loading}>
                    Код не работает? Получить новый
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
