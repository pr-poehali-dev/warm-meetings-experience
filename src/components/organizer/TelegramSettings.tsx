import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { organizerApi, OrgNotifySettings } from "@/lib/organizer-api";
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
  const [checking, setChecking] = useState(false);
  const [notifySettings, setNotifySettings] = useState<OrgNotifySettings | null>(null);
  const [savingNotify, setSavingNotify] = useState(false);

  useEffect(() => {
    organizerApi.getNotifySettings()
      .then(setNotifySettings)
      .catch(() => {});
  }, []);

  const handleNotifyToggle = async (field: keyof Pick<OrgNotifySettings, "notify_telegram" | "notify_email" | "notify_vk">) => {
    if (!notifySettings) return;
    const newVal = !notifySettings[field];
    setNotifySettings({ ...notifySettings, [field]: newVal });
    setSavingNotify(true);
    try {
      await organizerApi.updateNotifySettings({ [field]: newVal });
    } catch {
      setNotifySettings({ ...notifySettings });
      toast.error("Не удалось сохранить настройки");
    } finally {
      setSavingNotify(false);
    }
  };

  const handleGetCode = async () => {
    setLoading(true);
    try {
      const data = await organizerApi.getTelegramCode();
      setCode(data.code);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось получить код. Попробуйте ещё раз.");
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

  const handleCheck = async () => {
    setChecking(true);
    await onRefresh();
    setTimeout(() => setChecking(false), 1000);
  };

  const step1Done = tgLinked;
  const step2Done = tgChannelsCount > 0;
  const allDone = step1Done && step2Done;

  return (
    <div className="space-y-5">

      {/* Шапка */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Icon name="Send" size={20} className="text-primary" />
          Telegram-бот для организаторов
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Бот автоматически публикует события в ваш канал и присылает уведомления о новых записях
        </p>
      </div>

      {/* Прогресс */}
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

      {/* ВСЁ НАСТРОЕНО */}
      {allDone && (
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
      )}

      {/* Каналы уведомлений о новых записях */}
      {notifySettings && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div>
              <p className="font-semibold text-sm">Уведомления о новых записях</p>
              <p className="text-xs text-muted-foreground mt-0.5">Выберите, куда присылать оповещение когда кто-то записался на вашу встречу</p>
            </div>
            <div className="space-y-2">
              {/* Telegram */}
              <NotifyChannelRow
                icon="Send"
                label="Telegram"
                description={notifySettings.tg_linked ? "Личное сообщение в Telegram" : "Нужно привязать аккаунт выше"}
                active={notifySettings.notify_telegram && notifySettings.tg_linked}
                disabled={!notifySettings.tg_linked || savingNotify}
                onToggle={() => handleNotifyToggle("notify_telegram")}
              />
              {/* Email */}
              <NotifyChannelRow
                icon="Mail"
                label="Email"
                description={notifySettings.email ? notifySettings.email : "Email не указан в профиле"}
                active={notifySettings.notify_email && !!notifySettings.email}
                disabled={!notifySettings.email || savingNotify}
                onToggle={() => handleNotifyToggle("notify_email")}
              />
              {/* VK */}
              <NotifyChannelRow
                icon="MessageCircle"
                label="ВКонтакте"
                description={notifySettings.vk_id ? "Личное сообщение от сообщества" : "VK не привязан в профиле"}
                active={notifySettings.notify_vk && !!notifySettings.vk_id}
                disabled={!notifySettings.vk_id || savingNotify}
                onToggle={() => handleNotifyToggle("notify_vk")}
              />
            </div>
            {!notifySettings.tg_linked && !notifySettings.email && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                Настройте хотя бы один канал, чтобы получать уведомления о записях.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ШАГ 1: Привязка аккаунта */}
      {!step1Done && (
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-5 space-y-4">
            {/* Заголовок шага */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base flex-shrink-0">
                1
              </div>
              <div>
                <div className="font-semibold">Привяжите ваш Telegram-аккаунт</div>
                <div className="text-xs text-muted-foreground">Один раз — и бот будет знать, кто вы</div>
              </div>
            </div>

            {/* Пояснение */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
              <div className="flex gap-2">
                <Icon name="Info" size={15} className="flex-shrink-0 mt-0.5 text-blue-500" />
                <p>Привязка нужна, чтобы бот знал — уведомления о новых записях отправлять именно вам, а не кому-то другому.</p>
              </div>
            </div>

            {!code ? (
              <>
                {/* Шаги до получения кода */}
                <div className="space-y-2">
                  <StepRow number={1} text="Нажмите кнопку «Получить код» — появится одноразовый код" />
                  <StepRow number={2} text={<>Откройте бота в Telegram: <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="text-primary font-medium underline">{BOT_NAME}</a></>} />
                  <StepRow number={3} text="Отправьте боту команду /verify и ваш код — аккаунт привяжется автоматически" />
                </div>

                <Button onClick={handleGetCode} disabled={loading} className="w-full gap-2" size="lg">
                  {loading
                    ? <><Icon name="Loader2" size={16} className="animate-spin" /> Генерирую код...</>
                    : <><Icon name="Key" size={16} /> Получить код привязки</>
                  }
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                {/* Код */}
                <div className="text-center p-5 bg-muted rounded-2xl border-2 border-dashed">
                  <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Ваш код привязки</div>
                  <div className="text-4xl font-mono font-bold tracking-[0.2em] text-foreground mb-2">{code}</div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600">
                    <Icon name="Clock" size={12} />
                    Действителен 10 минут
                  </div>
                </div>

                {/* Пошаговая инструкция */}
                <div className="space-y-3">
                  {/* Шаг 1 — открыть бота */}
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

                  {/* Шаг 2 — скопировать и отправить команду */}
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
                          onClick={() => handleCopy(`/verify ${code}`)}
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

                  {/* Шаг 3 — вернуться */}
                  <div className="border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                      <span className="text-sm font-medium">Вернитесь сюда и нажмите кнопку ниже</span>
                    </div>
                    <div className="p-3 space-y-2">
                      <Button onClick={handleCheck} disabled={checking} variant="default" className="w-full gap-2">
                        {checking
                          ? <><Icon name="Loader2" size={15} className="animate-spin" /> Проверяю...</>
                          : <><Icon name="RefreshCw" size={15} /> Я отправил — проверить привязку</>
                        }
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground text-xs" onClick={handleGetCode} disabled={loading}>
                        Код не работает? Получить новый
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ШАГ 2: Подключение канала */}
      {step1Done && !step2Done && (
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-5 space-y-4">
            {/* Заголовок шага */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base flex-shrink-0">
                2
              </div>
              <div>
                <div className="font-semibold">Подключите ваш Telegram-канал или группу</div>
                <div className="text-xs text-muted-foreground">Сюда будут приходить анонсы событий</div>
              </div>
            </div>

            {/* Пояснение */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
              <div className="flex gap-2">
                <Icon name="Info" size={15} className="flex-shrink-0 mt-0.5 text-blue-500" />
                <p>Бот должен быть администратором вашего канала — иначе он не сможет туда писать. Не переживайте, это стандартная процедура для всех Telegram-ботов.</p>
              </div>
            </div>

            {/* Инструкция */}
            <div className="space-y-3">
              {/* Шаг 1 */}
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

              {/* Шаг 2 */}
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
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => handleCopy("/add")}>
                      <Icon name="Copy" size={12} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Шаг 3 */}
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

              {/* Шаг 4 — проверить */}
              <div className="border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
                  <span className="text-sm font-medium">Вернитесь и нажмите кнопку проверки</span>
                </div>
                <div className="p-3">
                  <Button onClick={handleCheck} disabled={checking} className="w-full gap-2">
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
      )}
    </div>
  );
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

function NotifyChannelRow({ icon, label, description, active, disabled, onToggle }: {
  icon: string; label: string; description: string;
  active: boolean; disabled: boolean; onToggle: () => void;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${active ? "border-green-200 bg-green-50/50" : "border-border bg-muted/20"} ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2.5">
        <Icon name={icon as "Send"} size={15} className={active ? "text-green-600" : "text-muted-foreground"} />
        <div>
          <p className="text-sm font-medium leading-tight">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${active ? "bg-green-500" : "bg-muted-foreground/30"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    </div>
  );
}