import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { organizerApi } from "@/lib/organizer-api";
import { toast } from "sonner";

interface Props {
  tgLinked: boolean;
  tgChannelsCount: number;
  onRefresh: () => void;
}

export default function TelegramSettings({ tgLinked, tgChannelsCount, onRefresh }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGetCode = async () => {
    setLoading(true);
    try {
      const data = await organizerApi.getTelegramCode();
      setCode(data.code);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось получить код");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="Send" size={18} />
            Telegram-бот
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Подключите бота, чтобы новые события автоматически публиковались в ваши Telegram-каналы и чаты.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tgLinked ? 'bg-green-100' : 'bg-muted'}`}>
                <Icon name={tgLinked ? "Check" : "Link"} size={16} className={tgLinked ? 'text-green-600' : 'text-muted-foreground'} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {tgLinked ? "Аккаунт привязан" : "Шаг 1: Привяжите аккаунт"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {tgLinked
                    ? "Ваш Telegram связан с профилем на сайте"
                    : "Получите код и отправьте его боту"}
                </div>
              </div>
              {tgLinked && (
                <Icon name="CheckCircle2" size={18} className="text-green-500 flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tgChannelsCount > 0 ? 'bg-green-100' : 'bg-muted'}`}>
                <Icon name={tgChannelsCount > 0 ? "Check" : "Hash"} size={16} className={tgChannelsCount > 0 ? 'text-green-600' : 'text-muted-foreground'} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {tgChannelsCount > 0 ? `Каналов: ${tgChannelsCount}` : "Шаг 2: Подключите канал"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {tgChannelsCount > 0
                    ? "События публикуются автоматически"
                    : "Добавьте бота в канал и отправьте /add"}
                </div>
              </div>
              {tgChannelsCount > 0 && (
                <Icon name="CheckCircle2" size={18} className="text-green-500 flex-shrink-0" />
              )}
            </div>
          </div>

          {!tgLinked && (
            <div className="space-y-3 pt-2">
              {!code ? (
                <Button onClick={handleGetCode} disabled={loading} className="w-full gap-2">
                  {loading ? (
                    <Icon name="Loader2" size={16} className="animate-spin" />
                  ) : (
                    <Icon name="Key" size={16} />
                  )}
                  Получить код привязки
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Ваш код:</div>
                    <div className="text-2xl font-mono font-bold tracking-wider">{code}</div>
                    <div className="text-xs text-muted-foreground mt-1">Действителен 10 минут</div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>1. Откройте бота в Telegram:</p>
                    <a
                      href="https://t.me/sparcom_publish_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Icon name="ExternalLink" size={14} />
                      @sparcom_publish_bot
                    </a>
                    <p>2. Отправьте боту команду:</p>
                    <code className="block bg-background border rounded px-3 py-2 text-sm font-mono">/verify {code}</code>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { onRefresh(); setCode(null); }} className="w-full gap-2">
                    <Icon name="RefreshCw" size={14} />
                    Проверить привязку
                  </Button>
                </div>
              )}
            </div>
          )}

          {tgLinked && tgChannelsCount === 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-sm text-muted-foreground">
                Аккаунт привязан. Теперь подключите канал через бота:
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>1. Добавьте бота в администраторы канала</p>
                <p>2. Отправьте боту команду <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/add</code></p>
                <p>3. Перешлите боту любое сообщение из канала</p>
              </div>
              <a
                href="https://t.me/sparcom_publish_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors mt-2"
              >
                <Icon name="ExternalLink" size={14} />
                Открыть бота
              </a>
            </div>
          )}

          {tgLinked && tgChannelsCount > 0 && (
            <div className="pt-2 text-sm text-muted-foreground">
              <p>Управление каналами и шаблонами — в боте:</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                <li><code>/list</code> — список каналов</li>
                <li><code>/template</code> — настроить шаблон</li>
                <li><code>/test</code> — тестовый пост</li>
                <li><code>/remove</code> — отключить канал</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
