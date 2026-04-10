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

const BOT_URL = "https://t.me/SparcomEventsBot";
const BOT_NAME = "@SparcomEventsBot";

export default function TelegramSettings({ tgLinked, tgChannelsCount, onRefresh }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGetCode = async () => {
    setLoading(true);
    try {
      const data = await organizerApi.getTelegramCode();
      setCode(data.code);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось получить код привязки. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">

      {/* Статус */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="Send" size={18} />
            Подключение Telegram
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tgLinked ? "bg-green-100" : "bg-muted"}`}>
              <Icon name={tgLinked ? "Check" : "Link"} size={16} className={tgLinked ? "text-green-600" : "text-muted-foreground"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{tgLinked ? "Аккаунт привязан" : "Шаг 1 — Привяжите аккаунт"}</div>
              <div className="text-xs text-muted-foreground">
                {tgLinked ? "Ваш Telegram успешно связан с профилем на сайте" : "Получите код и отправьте его боту — займёт меньше минуты"}
              </div>
            </div>
            {tgLinked && <Icon name="CheckCircle2" size={18} className="text-green-500 flex-shrink-0" />}
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tgChannelsCount > 0 ? "bg-green-100" : "bg-muted"}`}>
              <Icon name={tgChannelsCount > 0 ? "Check" : "Hash"} size={16} className={tgChannelsCount > 0 ? "text-green-600" : "text-muted-foreground"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">
                {tgChannelsCount > 0 ? `Подключено каналов: ${tgChannelsCount}` : "Шаг 2 — Добавьте канал или чат"}
              </div>
              <div className="text-xs text-muted-foreground">
                {tgChannelsCount > 0 ? "Новые события публикуются автоматически" : "Добавьте бота в администраторы вашего канала"}
              </div>
            </div>
            {tgChannelsCount > 0 && <Icon name="CheckCircle2" size={18} className="text-green-500 flex-shrink-0" />}
          </div>
        </CardContent>
      </Card>

      {/* Шаг 1: привязка аккаунта */}
      {!tgLinked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
              Привяжите Telegram-аккаунт
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!code ? (
              <>
                {/* Что такое бот и зачем */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 text-sm space-y-1.5">
                  <p className="font-medium text-foreground flex items-center gap-1.5">
                    <Icon name="Info" size={14} className="text-primary flex-shrink-0" />
                    Что такое бот и зачем он нужен?
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Бот СПАРКОМ — это официальный Telegram-бот (<span className="font-mono">{BOT_NAME}</span>), который умеет публиковать ваши события в ваш канал или группу автоматически — как только вы нажмёте «Опубликовать» в кабинете.
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Чтобы это заработало, нужно один раз: привязать бота к своему аккаунту (шаг 1) и добавить его в ваш канал (шаг 2). Дальше всё будет происходить само.
                  </p>
                </div>

                {/* Как привязать */}
                <div className="text-sm space-y-2">
                  <p className="font-medium">Как привязать — два простых шага:</p>
                  <div className="space-y-2">
                    <div className="flex gap-3 p-3 bg-muted/40 rounded-lg">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>
                      <div className="text-sm text-muted-foreground">
                        Нажмите кнопку ниже — система выдаст вам одноразовый цифровой код
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 bg-muted/40 rounded-lg">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>
                      <div className="text-sm text-muted-foreground">
                        Откройте бота в Telegram по ссылке{" "}
                        <a href={BOT_URL} target="_blank" rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline">{BOT_NAME}</a>{" "}
                        и отправьте ему команду{" "}
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/verify ВАШ_КОД</code>
                        <p className="text-xs mt-1 text-muted-foreground/70">Точную команду для копирования вы увидите сразу после получения кода</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pl-1">Код действует 10 минут. Если истёк — просто нажмите «Получить код» снова.</p>
                </div>

                <Button onClick={handleGetCode} disabled={loading} className="w-full gap-2">
                  {loading ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Key" size={16} />}
                  Получить код привязки
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-4 bg-muted rounded-xl border">
                  <div className="text-xs text-muted-foreground mb-1">Ваш код привязки:</div>
                  <div className="text-3xl font-mono font-bold tracking-widest mb-1">{code}</div>
                  <div className="text-xs text-muted-foreground">Действителен 10 минут</div>
                </div>

                <div className="space-y-3 text-sm">
                  <p className="font-medium">Что делать дальше:</p>

                  <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>
                    <div>
                      <p className="text-sm">Откройте бота СПАРКОМ в Telegram:</p>
                      <a href={BOT_URL} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-1">
                        <Icon name="ExternalLink" size={14} />
                        {BOT_NAME}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm mb-2">Отправьте боту следующую команду:</p>
                      <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2">
                        <code className="text-sm font-mono flex-1">/verify {code}</code>
                        <button onClick={() => handleCopy(`/verify ${code}`)}
                          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          title="Скопировать">
                          <Icon name={copied ? "Check" : "Copy"} size={14} className={copied ? "text-green-500" : ""} />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">Нажмите на иконку, чтобы скопировать команду</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span>
                    <p className="text-sm">Бот подтвердит привязку — вернитесь сюда и нажмите «Проверить»</p>
                  </div>
                </div>

                <Button variant="outline" onClick={() => { onRefresh(); setCode(null); }} className="w-full gap-2">
                  <Icon name="RefreshCw" size={14} />
                  Проверить привязку
                </Button>
                <button onClick={() => setCode(null)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Получить другой код
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Шаг 2: подключение канала */}
      {tgLinked && tgChannelsCount === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
              Подключите Telegram-канал или чат
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Пояснение */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 space-y-1.5">
              <p className="font-medium text-foreground text-sm flex items-center gap-1.5">
                <Icon name="Info" size={14} className="text-primary flex-shrink-0" />
                Зачем добавлять бота в канал?
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Чтобы бот мог публиковать посты, он должен быть участником вашего канала или группы с правом отправлять сообщения — как любой другой администратор.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Если у вас ещё нет Telegram-канала — создайте его: откройте Telegram → «Создать канал» → укажите название. Канал можно сделать публичным или приватным, это не важно.
              </p>
            </div>

            {/* Шаги */}
            <div className="space-y-2">

              <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>
                <div className="text-sm">
                  <p className="font-medium mb-0.5">Добавьте бота в администраторы канала</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Откройте ваш канал в Telegram → «Управление каналом» → «Администраторы» → «Добавить администратора» → найдите <span className="font-mono">{BOT_NAME}</span> → добавьте с правом отправлять сообщения.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Если у вас группа — просто пригласите бота как обычного участника.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>
                <div className="text-sm">
                  <p className="font-medium mb-0.5">Откройте бота и отправьте команду /add</p>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-2">
                    Перейдите в чат с ботом — он скажет, что ждёт сообщение из канала.
                  </p>
                  <a href={BOT_URL} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <Icon name="ExternalLink" size={14} />
                    Открыть {BOT_NAME}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span>
                <div className="text-sm">
                  <p className="font-medium mb-0.5">Перешлите боту любое сообщение из канала</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Зайдите в ваш канал → нажмите на любое сообщение → «Переслать» → выберите {BOT_NAME}. Бот распознает канал и подтвердит подключение.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Если в канале ещё нет сообщений — напишите туда что угодно, а затем перешлите это боту.</p>
                </div>
              </div>

            </div>

            <Button variant="outline" onClick={onRefresh} className="w-full gap-2">
              <Icon name="RefreshCw" size={14} />
              Проверить — канал подключён
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Всё подключено — команды управления */}
      {tgLinked && tgChannelsCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Icon name="CheckCircle2" size={16} className="text-green-500" />
              Всё готово — бот настроен
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800 leading-relaxed">
              Теперь каждый раз, когда вы нажмёте «Опубликовать» при создании события — бот автоматически отправит анонс в подключённый канал. Ничего дополнительно делать не нужно.
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Дополнительные возможности — через бота:</p>
              {[
                { cmd: "/list", desc: "Список подключённых каналов и чатов" },
                { cmd: "/template", desc: "Изменить шаблон поста (текст, эмодзи, формат)" },
                { cmd: "/test", desc: "Отправить пробную публикацию и проверить вёрстку" },
                { cmd: "/remove", desc: "Отключить канал — бот перестанет туда писать" },
                { cmd: "/help", desc: "Полный список команд" },
              ].map(({ cmd, desc }) => (
                <div key={cmd} className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono w-24 flex-shrink-0 mt-0.5">{cmd}</code>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>

            <a href={BOT_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <Icon name="ExternalLink" size={14} />
              Открыть {BOT_NAME}
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}