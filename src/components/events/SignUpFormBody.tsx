import BathCaptcha, { BathCaptchaState } from "@/components/BathCaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/ui/icon";
import ConsentModal from "@/components/ConsentModal";
import { formatPhone } from "@/hooks/usePhoneMask";
import { User } from "@/lib/user-api";
import PricingCalculator from "@/components/events/PricingCalculator";

interface SignUpFormBodyProps {
  user: User | null;
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  telegram: string;
  setTelegram: (v: string) => void;
  preferredChannel: "telegram" | "vk" | "email" | "phone";
  setPreferredChannel: (v: "telegram" | "vk" | "email" | "phone") => void;
  vkContact: string;
  setVkContact: (v: string) => void;
  consentPd: boolean;
  setConsentPd: (v: boolean) => void;
  consentShare: boolean;
  setConsentShare: (v: boolean) => void;
  consentCancel: boolean;
  setConsentCancel: (v: boolean) => void;
  comment: string;
  setComment: (v: string) => void;
  guests: { name: string; phone: string }[];
  addGuest: () => void;
  removeGuest: (i: number) => void;
  updateGuest: (i: number, field: "name" | "phone", value: string) => void;
  honeypot: string;
  setHoneypot: (v: string) => void;
  loading: boolean;
  canSubmit: boolean;
  captcha: BathCaptchaState;
  touched: boolean;
  errors: {
    name: boolean;
    phone: boolean;
    email: boolean;
    telegramChannel: boolean;
    vkChannel: boolean;
    consentPd: boolean;
    consentShare: boolean;
    consentCancel: boolean;
  };
  vkAuthLoading: boolean;
  yandexAuthLoading: boolean;
  onSocialLogin: (provider: "vk" | "yandex") => void;
  onSubmit: (e: React.FormEvent) => void;
  pricingLines?: string[];
}

export default function SignUpFormBody({
  user,
  name, setName,
  phone, setPhone,
  email, setEmail,
  telegram, setTelegram,
  preferredChannel, setPreferredChannel,
  vkContact, setVkContact,
  consentPd, setConsentPd,
  consentShare, setConsentShare,
  consentCancel, setConsentCancel,
  comment, setComment,
  guests, addGuest, removeGuest, updateGuest,
  honeypot, setHoneypot,
  loading,
  canSubmit,
  captcha,
  touched,
  errors,
  vkAuthLoading,
  yandexAuthLoading,
  onSocialLogin,
  onSubmit,
  pricingLines,
}: SignUpFormBodyProps) {
  const showError = (field: keyof typeof errors) => touched && errors[field];
  const errBorder = (field: keyof typeof errors) =>
    showError(field) ? "border-red-400 focus-visible:ring-red-300" : "";

  return (
    <>
      <form onSubmit={onSubmit} className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
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
                onClick={() => onSocialLogin("vk")}
                disabled={vkAuthLoading}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#0077FF] text-white text-sm font-medium hover:bg-[#0066DD] disabled:opacity-60 transition-colors"
              >
                {vkAuthLoading ? (
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
                onClick={() => onSocialLogin("yandex")}
                disabled={yandexAuthLoading}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#FC3F1D] text-white text-sm font-medium hover:bg-[#E63818] disabled:opacity-60 transition-colors"
              >
                {yandexAuthLoading ? (
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

        {/* Калькулятор стоимости */}
        {pricingLines && pricingLines.filter(Boolean).length > 0 && (
          <PricingCalculator lines={pricingLines.filter(Boolean)} />
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
              placeholder="+7(___) ___-__-__"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
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

        {/* Дополнительные участники */}
        <div className="pt-1 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Дополнительные участники</Label>
            <span className="text-xs text-muted-foreground">{guests.length > 0 ? `+${guests.length}` : "по желанию"}</span>
          </div>
          {guests.map((g, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Участник {i + 2}</span>
                <button
                  type="button"
                  onClick={() => removeGuest(i)}
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                  aria-label="Удалить участника"
                >
                  <Icon name="X" size={16} />
                </button>
              </div>
              <Input
                placeholder="Имя"
                value={g.name}
                onChange={(e) => updateGuest(i, "name", e.target.value)}
                className="rounded-lg"
              />
              <Input
                type="tel"
                placeholder="+7(___) ___-__-__"
                value={g.phone}
                onChange={(e) => updateGuest(i, "phone", formatPhone(e.target.value))}
                className="rounded-lg"
              />
            </div>
          ))}
          {guests.length < 20 && (
            <Button
              type="button"
              variant="outline"
              onClick={addGuest}
              className="w-full rounded-lg gap-2 text-sm"
            >
              <Icon name="UserPlus" size={15} />
              Добавить участника
            </Button>
          )}
        </div>

        {/* Комментарий */}
        <div className="pt-1 border-t border-border space-y-1.5">
          <Label htmlFor="su-comment" className="text-sm font-medium">Комментарий для организатора</Label>
          <Textarea
            id="su-comment"
            placeholder="Пожелания, вопросы или детали — необязательно"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={2000}
            className="rounded-lg resize-none"
          />
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
      </form>

      <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t space-y-3">
        {!user && <BathCaptcha {...captcha} />}
        <Button
          type="submit"
          form="signup-form"
          disabled={loading || !canSubmit}
          className="w-full rounded-xl gap-2"
          size="lg"
          onClick={onSubmit}
        >
          {loading
            ? <><Icon name="Loader2" size={16} className="animate-spin" /> Отправляю...</>
            : <><Icon name="CalendarCheck" size={16} /> Участвую</>
          }
        </Button>
      </div>
    </>
  );
}