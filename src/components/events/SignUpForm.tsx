import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { signupsApi } from "@/lib/api";
import ConsentModal from "@/components/ConsentModal";
import { useAuth } from "@/contexts/AuthContext";
import { useVkAuth } from "@/components/extensions/vk-auth/useVkAuth";
import { useYandexAuth } from "@/components/extensions/yandex-auth/useYandexAuth";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const VK_AUTH_URL = "https://functions.poehali.dev/e0433198-3f6a-4251-aacd-b238beddae39";
const YANDEX_AUTH_URL = "https://functions.poehali.dev/1e5f15d8-b432-4341-9a18-4c408d3d80aa";

interface SignUpFormProps {
  eventId: number;
  eventTitle: string;
  spotsLeft: number;
  price?: number;
  priceLabel?: string;
  eventDate?: string;
  timeStart?: string;
  timeEnd?: string;
  bathName?: string;
  totalSpots?: number;
}

type Screen = "form" | "success";

const TG_BOT = "https://t.me/sparcom_ru";

export default function SignUpForm({
  eventId,
  eventTitle,
  spotsLeft,
  price,
  priceLabel,
  eventDate,
  timeStart,
  timeEnd,
  bathName,
  totalSpots,
}: SignUpFormProps) {
  const { user } = useAuth();
  const vkAuth = useVkAuth({
    apiUrls: {
      authUrl: `${VK_AUTH_URL}?action=auth-url`,
      callback: `${VK_AUTH_URL}?action=callback`,
      refresh: `${VK_AUTH_URL}?action=refresh`,
      logout: `${VK_AUTH_URL}?action=logout`,
    },
  });
  const yandexAuth = useYandexAuth({
    apiUrls: {
      authUrl: `${YANDEX_AUTH_URL}?action=auth-url`,
      callback: `${YANDEX_AUTH_URL}?action=callback`,
      refresh: `${YANDEX_AUTH_URL}?action=refresh`,
      logout: `${YANDEX_AUTH_URL}?action=logout`,
    },
  });
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("form");
  const [touched, setTouched] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [formOpenedAt, setFormOpenedAt] = useState<number>(0);

  useEffect(() => {
    if (open && screen === "form" && formOpenedAt === 0) {
      setFormOpenedAt(Date.now());
    }
    if (!open) {
      setFormOpenedAt(0);
      setHoneypot("");
    }
  }, [open, screen, formOpenedAt]);

  const handleSocialLogin = (provider: "vk" | "yandex") => {
    const returnUrl = `${window.location.pathname}${window.location.search}${window.location.search.includes("?") ? "&" : "?"}signup_open=1`;
    sessionStorage.setItem("signup_return_url", returnUrl);
    sessionStorage.setItem("signup_login_provider", provider);
    if (provider === "vk") {
      vkAuth.login();
    } else {
      yandexAuth.login();
    }
  };

  // Автооткрытие формы после возврата с OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signup_open") === "1") {
      setOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("signup_open");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [preferredChannel, setPreferredChannel] = useState<"telegram" | "vk" | "email" | "phone">("phone");
  const [vkContact, setVkContact] = useState("");
  const [consentPd, setConsentPd] = useState(false);
  const [consentShare, setConsentShare] = useState(false);
  const [consentCancel, setConsentCancel] = useState(false);
  const [loading, setLoading] = useState(false);

  // Авто-подстановка данных авторизованного пользователя
  useEffect(() => {
    if (user && open) {
      setName((prev) => prev || user.name || "");
      setPhone((prev) => prev || user.phone || "");
      setEmail((prev) => prev || user.email || "");
      setTelegram((prev) => prev || user.telegram || "");
      if (user.telegram) setPreferredChannel((prev) => prev || "telegram");
      else if (user.vk_id) setPreferredChannel("vk");
    }
  }, [user, open]);

  const errors = {
    name: !name.trim(),
    phone: !phone.trim() || phone.trim().length < 6,
    email: !email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()),
    telegramChannel: preferredChannel === "telegram" && !telegram.trim(),
    vkChannel: preferredChannel === "vk" && !vkContact.trim(),
    consentPd: !consentPd,
    consentShare: !consentShare,
    consentCancel: !consentCancel,
  };

  const channelValueOk =
    (preferredChannel === "telegram" && telegram.trim()) ||
    (preferredChannel === "vk" && vkContact.trim()) ||
    (preferredChannel === "email" && !errors.email) ||
    (preferredChannel === "phone" && !errors.phone);

  const canSubmit = !errors.name && !errors.phone && !errors.email && !errors.consentPd && !errors.consentShare && !errors.consentCancel && !!channelValueOk;

  const filledSpots = totalSpots && totalSpots > 0 ? Math.max(0, totalSpots - spotsLeft) : 0;
  const fillPercent = totalSpots && totalSpots > 0 ? Math.min(100, Math.round((filledSpots / totalSpots) * 100)) : 0;

  const dateObj = eventDate ? new Date(eventDate) : null;
  const dateLabel = dateObj && !isNaN(dateObj.getTime())
    ? format(dateObj, "d MMMM", { locale: ru })
    : null;
  const timeLabel = timeStart && timeEnd ? `${timeStart.slice(0, 5)}–${timeEnd.slice(0, 5)}` : timeStart?.slice(0, 5);

  const openModal = () => {
    setScreen("form");
    setTouched(false);
    setOpen(true);
  };

  const reset = () => {
    if (!user) {
      setName(""); setPhone(""); setEmail(""); setTelegram("");
    }
    setVkContact("");
    setConsentPd(false); setConsentShare(false); setConsentCancel(false);
    setTouched(false);
    setScreen("form");
  };

  const handleClose = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) {
      toast.error("Заполните обязательные поля");
      return;
    }
    setLoading(true);
    try {
      const channelValue =
        preferredChannel === "telegram" ? telegram :
        preferredChannel === "vk" ? vkContact :
        preferredChannel === "email" ? email :
        phone;
      const formOpenMs = formOpenedAt > 0 ? Date.now() - formOpenedAt : 0;
      await signupsApi.create({
        event_id: eventId,
        name,
        phone,
        email,
        telegram,
        consent_pd: true,
        preferred_channel: preferredChannel === "phone" ? "sms" : preferredChannel,
        preferred_contact_value: channelValue,
        website: honeypot,
        form_open_ms: formOpenMs,
      });
      setScreen("success");
    } catch (err: unknown) {
      const e = err as { status?: number; response?: { status?: number }; message?: string };
      const status = e?.status || e?.response?.status || (e?.message?.includes("429") ? 429 : undefined);
      if (status === 429) {
        toast.error("Слишком много заявок. Попробуйте через минуту.");
      } else {
        toast.error("Не удалось отправить заявку. Попробуйте позже.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (spotsLeft === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-600 font-medium mb-3">Все места заняты</p>
        <Button variant="outline" className="rounded-full gap-2" onClick={() => window.open(TG_BOT, "_blank")}>
          <Icon name="MessageCircle" size={15} />
          В лист ожидания
        </Button>
      </div>
    );
  }

  const showError = (field: keyof typeof errors) => touched && errors[field];
  const errBorder = (field: keyof typeof errors) => showError(field) ? "border-red-400 focus-visible:ring-red-300" : "";

  return (
    <>
      <Button size="lg" className="w-full rounded-xl gap-2 text-base" onClick={openModal}>
        <Icon name="CalendarCheck" size={18} />
        Записаться
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">

          {/* ── УСПЕХ ─────────────────────────────────────────────── */}
          {screen === "success" && (
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
              <Button className="rounded-xl gap-2 w-full" onClick={() => handleClose(false)}>
                <Icon name="Check" size={16} />
                Готово
              </Button>
            </div>
          )}

          {/* ── ОСНОВНОЕ ОКНО ─────────────────────────────────────── */}
          {screen === "form" && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="text-base font-semibold leading-tight">
                  Запись на «{eventTitle}»
                </DialogTitle>
                {(dateLabel || timeLabel || bathName) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
                    {dateLabel && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="Calendar" size={12} />
                        {dateLabel}
                      </span>
                    )}
                    {timeLabel && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="Clock" size={12} />
                        {timeLabel}
                      </span>
                    )}
                    {bathName && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="MapPin" size={12} />
                        {bathName}
                      </span>
                    )}
                  </div>
                )}
                {priceLabel && (
                  <p className="text-sm font-medium text-accent mt-1.5">{priceLabel}</p>
                )}

                {totalSpots && totalSpots > 0 && (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        Заполнено {filledSpots} из {totalSpots}
                      </span>
                      <span className={`font-medium ${spotsLeft <= 2 ? "text-orange-600" : "text-green-600"}`}>
                        {spotsLeft <= 2 ? `Осталось ${spotsLeft}!` : `Осталось ${spotsLeft}`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${spotsLeft <= 2 ? "bg-orange-500" : "bg-green-500"}`}
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </DialogHeader>

              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* honeypot — скрытое поле для ботов */}
                <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
                  <label htmlFor="su-website">Website</label>
                  <input
                    id="su-website"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                {/* Авторизация / плашка пользователя */}
                {user ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Icon name="UserCheck" size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">Вы вошли как</div>
                      <div className="text-sm font-medium truncate">{user.name}</div>
                    </div>
                    <Icon name="CheckCircle2" size={18} className="text-green-600 shrink-0" />
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-xs text-muted-foreground">Войти за 1 клик и заполнить форму автоматически:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSocialLogin("vk")}
                        disabled={vkAuth.isLoading}
                        className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#0077FF] text-white text-sm font-medium hover:bg-[#0066DD] disabled:opacity-60 transition-colors"
                      >
                        {vkAuth.isLoading ? (
                          <Icon name="Loader2" size={16} className="animate-spin" />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.596-.19 1.365 1.26 2.179 1.818.615.42 1.083.328 1.083.328l2.175-.03s1.138-.07.598-.964c-.044-.073-.314-.661-1.618-1.869-1.366-1.266-1.183-1.061.462-3.252.999-1.333 1.398-2.146 1.273-2.494-.12-.332-.854-.244-.854-.244l-2.449.015s-.182-.025-.316.056c-.131.079-.216.264-.216.264s-.386 1.028-.901 1.902c-1.088 1.848-1.523 1.946-1.7 1.832-.413-.267-.31-1.075-.31-1.649 0-1.794.272-2.541-.529-2.735-.266-.064-.462-.107-1.142-.114-.873-.009-1.612.003-2.03.208-.279.137-.494.442-.363.459.162.021.529.099.723.364.251.342.242 1.11.242 1.11s.144 2.111-.336 2.372c-.33.18-.783-.187-1.755-1.866-.498-.859-.874-1.81-.874-1.81s-.072-.177-.201-.272c-.156-.115-.375-.151-.375-.151l-2.327.015s-.349.01-.477.161c-.114.135-.009.413-.009.413s1.816 4.25 3.87 6.392c1.883 1.965 4.022 1.836 4.022 1.836h.97z" />
                          </svg>
                        )}
                        ВКонтакте
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSocialLogin("yandex")}
                        disabled={yandexAuth.isLoading}
                        className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#FC3F1D] text-white text-sm font-medium hover:bg-[#E63818] disabled:opacity-60 transition-colors"
                      >
                        {yandexAuth.isLoading ? (
                          <Icon name="Loader2" size={16} className="animate-spin" />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M12.04.04C5.43.04.08,5.39.08,12s5.35,11.96,11.96,11.96,11.96-5.35,11.96-11.96S18.64.04,12.04.04ZM16.04,19.09h-2.47V6.82h-1.11c-2.03,0-3.09,1.03-3.09,2.54,0,1.71.74,2.51,2.25,3.54l1.25.84-3.59,5.37h-2.68l3.22-4.8c-1.85-1.33-2.89-2.62-2.89-4.8,0-2.74,1.91-4.6,5.53-4.6h3.59v14.19Z" />
                          </svg>
                        )}
                        Яндекс
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">или заполните вручную</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  </div>
                )}

                {/* Контактные данные */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label htmlFor="su-name" className="text-sm">Имя *</Label>
                    <Input
                      id="su-name"
                      placeholder="Как к вам обращаться"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`mt-1.5 rounded-lg ${errBorder("name")}`}
                    />
                    {showError("name") && <p className="text-xs text-red-500 mt-1">Укажите имя</p>}
                  </div>
                  <div>
                    <Label htmlFor="su-phone" className="text-sm">Телефон *</Label>
                    <Input
                      id="su-phone"
                      type="tel"
                      placeholder="+7 (___) ___-__-__"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`mt-1.5 rounded-lg ${errBorder("phone")}`}
                    />
                    {showError("phone") && <p className="text-xs text-red-500 mt-1">Укажите корректный номер</p>}
                  </div>
                  <div>
                    <Label htmlFor="su-email" className="text-sm">Email *</Label>
                    <Input
                      id="su-email"
                      type="email"
                      placeholder="your@email.ru"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`mt-1.5 rounded-lg ${errBorder("email")}`}
                    />
                    {showError("email") && <p className="text-xs text-red-500 mt-1">Введите корректный email</p>}
                  </div>
                </div>

                {/* Способ связи */}
                <div className="pt-1 border-t border-border space-y-3">
                  <Label className="text-sm font-medium">Как организатору связаться с вами? *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: "telegram" as const, label: "Telegram", icon: "Send" },
                      { v: "vk" as const, label: "ВКонтакте", icon: "MessageCircle" },
                      { v: "email" as const, label: "Email", icon: "Mail" },
                      { v: "phone" as const, label: "Звонок / SMS", icon: "Phone" },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setPreferredChannel(opt.v)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                          preferredChannel === opt.v
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon name={opt.icon} size={15} />
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {preferredChannel === "telegram" && (
                    <div>
                      <Label htmlFor="ch-tg" className="text-xs text-muted-foreground">Telegram-юзернейм или номер *</Label>
                      <Input
                        id="ch-tg"
                        placeholder="@username или +7..."
                        value={telegram}
                        onChange={(e) => setTelegram(e.target.value)}
                        className={`mt-1 rounded-lg ${errBorder("telegramChannel")}`}
                      />
                      {showError("telegramChannel") && <p className="text-xs text-red-500 mt-1">Укажите Telegram</p>}
                    </div>
                  )}
                  {preferredChannel === "vk" && (
                    <div>
                      <Label htmlFor="ch-vk" className="text-xs text-muted-foreground">Ссылка на профиль или ID *</Label>
                      <Input
                        id="ch-vk"
                        placeholder="vk.com/username"
                        value={vkContact}
                        onChange={(e) => setVkContact(e.target.value)}
                        className={`mt-1 rounded-lg ${errBorder("vkChannel")}`}
                      />
                      {showError("vkChannel") && <p className="text-xs text-red-500 mt-1">Укажите профиль ВК</p>}
                    </div>
                  )}
                  {preferredChannel === "email" && (
                    <p className="text-xs text-muted-foreground">Свяжемся по email, который вы указали выше.</p>
                  )}
                  {preferredChannel === "phone" && (
                    <p className="text-xs text-muted-foreground">Позвоним или напишем SMS на указанный номер.</p>
                  )}
                </div>

                {/* Мотивирующий блок гарантий */}
                <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5 space-y-1.5">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Icon name="Lock" size={13} className="text-green-600 mt-0.5 shrink-0" />
                    <span>Ваши данные защищены и передаются только организатору события</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Icon name="ShieldCheck" size={13} className="text-green-600 mt-0.5 shrink-0" />
                    <span>Бесплатная отмена за 48 часов до события</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Icon name="Bell" size={13} className="text-green-600 mt-0.5 shrink-0" />
                    <span>Напомним за день и за час до начала</span>
                  </div>
                </div>

                {/* Согласия */}
                <div className="space-y-2.5 pt-1 border-t border-border">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={consentPd}
                      onCheckedChange={(v) => setConsentPd(v === true)}
                      className={`mt-0.5 shrink-0 ${showError("consentPd") ? "border-red-400" : ""}`}
                    />
                    <span className={`text-xs leading-relaxed ${showError("consentPd") ? "text-red-600" : "text-muted-foreground"}`}>
                      Даю{" "}<ConsentModal trigger="согласие на обработку персональных данных" />{" "}в соответствии с ФЗ №152-ФЗ
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={consentShare}
                      onCheckedChange={(v) => setConsentShare(v === true)}
                      className={`mt-0.5 shrink-0 ${showError("consentShare") ? "border-red-400" : ""}`}
                    />
                    <span className={`text-xs leading-relaxed ${showError("consentShare") ? "text-red-600" : "text-muted-foreground"}`}>
                      Согласен(на) на передачу контактных данных организатору для связи
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={consentCancel}
                      onCheckedChange={(v) => setConsentCancel(v === true)}
                      className={`mt-0.5 shrink-0 ${showError("consentCancel") ? "border-red-400" : ""}`}
                    />
                    <span className={`text-xs leading-relaxed ${showError("consentCancel") ? "text-red-600" : "text-muted-foreground"}`}>
                      Ознакомлен(а) с условиями отмены участия
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl gap-2"
                  size="lg"
                >
                  {loading
                    ? <><Icon name="Loader2" size={16} className="animate-spin" /> Отправляю...</>
                    : <><Icon name="CalendarCheck" size={16} /> Участвую</>
                  }
                </Button>
              </form>
            </>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}