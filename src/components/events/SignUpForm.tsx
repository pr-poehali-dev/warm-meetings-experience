import { useState, useEffect } from "react";
import { useBathCaptcha } from "@/components/BathCaptcha";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { signupsApi } from "@/lib/api";
import { isPhoneComplete } from "@/hooks/usePhoneMask";
import { HttpError } from "@/lib/http";
import { useAuth } from "@/contexts/AuthContext";
import { useVkAuth } from "@/components/extensions/vk-auth/useVkAuth";
import { useYandexAuth } from "@/components/extensions/yandex-auth/useYandexAuth";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import SignUpDialogHeader from "./SignUpDialogHeader";
import { SignUpSuccessScreen, SignUpAlreadyRegisteredScreen } from "./SignUpScreens";
import SignUpFormBody from "./SignUpFormBody";

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
  crowdfundFee?: number;
  crowdfundAfterFreeze?: boolean;
  crowdfundFullPrice?: number;
}

type Screen = "form" | "success" | "already_registered";

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
  crowdfundFee,
  crowdfundAfterFreeze,
  crowdfundFullPrice,
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
  const captcha = useBathCaptcha();

  // Авто-подстановка данных авторизованного пользователя
  useEffect(() => {
    if (user && open) {
      setName((prev) => prev || user.name || "");
      setPhone((prev) => prev || user.phone || "");
      setEmail((prev) => prev || user.email || "");
      setTelegram((prev) => prev || user.telegram || "");
      if (user.telegram) setPreferredChannel((prev) => prev || "telegram");
      else if (user.vk_id) {
        setPreferredChannel("vk");
        setVkContact((prev) => prev || `vk.com/id${user.vk_id}`);
      }
    }
  }, [user, open]);

  const errors = {
    name: !name.trim(),
    phone: !isPhoneComplete(phone),
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

  const canSubmit = !errors.name && !errors.phone && !errors.email && !errors.consentPd && !errors.consentShare && !errors.consentCancel && !!channelValueOk && (!!user || captcha.isValid);

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
      captcha.reset();
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
      const status = err instanceof HttpError ? err.status : 0;
      if (status === 409) {
        setScreen("already_registered");
      } else if (status === 429) {
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

  return (
    <>
      <Button size="lg" className="w-full rounded-xl gap-2 text-base" onClick={openModal}>
        <Icon name="CalendarCheck" size={18} />
        {crowdfundAfterFreeze && crowdfundFullPrice
          ? `Записаться за ${crowdfundFullPrice.toLocaleString("ru-RU")} ₽`
          : crowdfundFee
            ? `Записаться за ${crowdfundFee.toLocaleString("ru-RU")} ₽`
            : "Записаться"}
      </Button>
      {crowdfundFee !== undefined && !crowdfundAfterFreeze && (
        <p className="text-[11px] text-muted-foreground mt-1 text-center px-1">
          Клубный взнос {crowdfundFee.toLocaleString("ru-RU")} ₽ при записи. Разницу до итоговой
          цены доплатите после стоп-сбора.
        </p>
      )}
      {crowdfundAfterFreeze && (
        <p className="text-[11px] text-muted-foreground mt-1 text-center px-1">
          Сбор закрыт — оплачиваете полную цену сразу.
        </p>
      )}

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 flex flex-col">

          {screen === "success" && (
            <SignUpSuccessScreen email={email} onClose={() => handleClose(false)} />
          )}

          {screen === "already_registered" && (
            <SignUpAlreadyRegisteredScreen
              eventTitle={eventTitle}
              dateLabel={dateLabel}
              timeLabel={timeLabel}
              bathName={bathName}
              onClose={() => handleClose(false)}
            />
          )}

          {screen === "form" && (
            <>
              <SignUpDialogHeader
                eventTitle={eventTitle}
                dateLabel={dateLabel}
                timeLabel={timeLabel}
                bathName={bathName}
                priceLabel={priceLabel}
                totalSpots={totalSpots}
                spotsLeft={spotsLeft}
                filledSpots={filledSpots}
                fillPercent={fillPercent}
              />
              <SignUpFormBody
                user={user}
                name={name} setName={setName}
                phone={phone} setPhone={setPhone}
                email={email} setEmail={setEmail}
                telegram={telegram} setTelegram={setTelegram}
                preferredChannel={preferredChannel} setPreferredChannel={setPreferredChannel}
                vkContact={vkContact} setVkContact={setVkContact}
                consentPd={consentPd} setConsentPd={setConsentPd}
                consentShare={consentShare} setConsentShare={setConsentShare}
                consentCancel={consentCancel} setConsentCancel={setConsentCancel}
                honeypot={honeypot} setHoneypot={setHoneypot}
                loading={loading}
                canSubmit={canSubmit}
                captcha={captcha}
                touched={touched}
                errors={errors}
                vkAuthLoading={vkAuth.isLoading}
                yandexAuthLoading={yandexAuth.isLoading}
                onSocialLogin={handleSocialLogin}
                onSubmit={handleSubmit}
              />
            </>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
