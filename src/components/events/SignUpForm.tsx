import { useState } from "react";
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

interface SignUpFormProps {
  eventId: number;
  eventTitle: string;
  spotsLeft: number;
  price?: number;
  priceLabel?: string;
}

type Screen = "choose" | "form" | "callback" | "success";

const TG_BOT = "https://t.me/sparcom_ru";
const VK_PAGE = "https://vk.com/sparcom";

export default function SignUpForm({ eventId, eventTitle, spotsLeft, price, priceLabel }: SignUpFormProps) {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("choose");

  // form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [consentPd, setConsentPd] = useState(false);
  const [consentShare, setConsentShare] = useState(false);
  const [consentCancel, setConsentCancel] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = consentPd && consentShare && consentCancel && name.trim() && phone.trim() && email.trim();

  const openModal = () => {
    setScreen("choose");
    setOpen(true);
  };

  const reset = () => {
    setName(""); setPhone(""); setEmail(""); setTelegram("");
    setConsentPd(false); setConsentShare(false); setConsentCancel(false);
    setScreen("choose");
  };

  const handleClose = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await signupsApi.create({ event_id: eventId, name, phone, email, telegram, consent_pd: true });
      setScreen("success");
    } catch {
      toast.error("Не удалось отправить заявку. Попробуйте позже.");
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
        Записаться
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">

          {/* ── ВЫБОР СПОСОБА ─────────────────────────────────────── */}
          {screen === "choose" && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="text-base font-semibold leading-tight">
                  Запись на «{eventTitle}»
                </DialogTitle>
                {priceLabel && (
                  <p className="text-sm text-muted-foreground mt-0.5">{priceLabel}</p>
                )}
              </DialogHeader>

              <div className="px-6 py-5 space-y-3">
                <p className="text-sm text-muted-foreground">Выберите удобный способ:</p>

                {/* Форма на сайте */}
                <button
                  onClick={() => setScreen("form")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-muted/40 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon name="ClipboardList" size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Заполнить форму</div>
                    <div className="text-xs text-muted-foreground">Быстро, прямо здесь</div>
                  </div>
                  <Icon name="ChevronRight" size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                {/* Telegram */}
                <a
                  href={`${TG_BOT}?start=signup_${eventId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-[#229ED9]/40 hover:bg-[#229ED9]/5 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#229ED9]/10 flex items-center justify-center shrink-0">
                    <Icon name="Send" size={18} className="text-[#229ED9]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Написать в Telegram</div>
                    <div className="text-xs text-muted-foreground">Ответим быстро</div>
                  </div>
                  <Icon name="ExternalLink" size={14} className="text-muted-foreground" />
                </a>

                {/* ВКонтакте */}
                <a
                  href={VK_PAGE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-[#4680C2]/40 hover:bg-[#4680C2]/5 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#4680C2]/10 flex items-center justify-center shrink-0 text-[#4680C2] font-bold text-sm">
                    ВК
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Написать ВКонтакте</div>
                    <div className="text-xs text-muted-foreground">Сообщество СПАРКОМ</div>
                  </div>
                  <Icon name="ExternalLink" size={14} className="text-muted-foreground" />
                </a>

                {/* Перезвонить */}
                <button
                  onClick={() => setScreen("callback")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-green-400/40 hover:bg-green-50 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Icon name="Phone" size={18} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Попросить перезвонить</div>
                    <div className="text-xs text-muted-foreground">Оставьте номер — мы свяжемся</div>
                  </div>
                  <Icon name="ChevronRight" size={16} className="text-muted-foreground group-hover:text-green-600 transition-colors" />
                </button>
              </div>
            </>
          )}

          {/* ── ФОРМА ЗАПИСИ ──────────────────────────────────────── */}
          {screen === "form" && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <button onClick={() => setScreen("choose")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Icon name="ArrowLeft" size={18} />
                  </button>
                  <DialogTitle className="text-base font-semibold">Заполните данные</DialogTitle>
                </div>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="su-name" className="text-sm">Имя *</Label>
                    <Input
                      id="su-name"
                      placeholder="Как к вам обращаться"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5 rounded-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="su-phone" className="text-sm">Телефон *</Label>
                    <Input
                      id="su-phone"
                      type="tel"
                      placeholder="+7 (___) ___-__-__"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1.5 rounded-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="su-email" className="text-sm">Email *</Label>
                    <Input
                      id="su-email"
                      type="email"
                      placeholder="your@email.ru"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1.5 rounded-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="su-tg" className="text-sm text-muted-foreground">Telegram <span className="font-normal">(необязательно)</span></Label>
                    <Input
                      id="su-tg"
                      placeholder="@username"
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                      className="mt-1.5 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-1 border-t border-border">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={consentPd}
                      onCheckedChange={(v) => setConsentPd(v === true)}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Даю{" "}<ConsentModal trigger="согласие на обработку персональных данных" />{" "}в соответствии с ФЗ №152-ФЗ
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={consentShare}
                      onCheckedChange={(v) => setConsentShare(v === true)}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Согласен(на) на передачу контактных данных организатору для связи
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={consentCancel}
                      onCheckedChange={(v) => setConsentCancel(v === true)}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Ознакомлен(а) с условиями отмены участия
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="w-full rounded-xl gap-2"
                  size="lg"
                >
                  {loading
                    ? <><Icon name="Loader2" size={16} className="animate-spin" /> Отправляю...</>
                    : <><Icon name="CalendarCheck" size={16} /> Записаться</>
                  }
                </Button>
              </form>
            </>
          )}

          {/* ── ПЕРЕЗВОНИТЬ ───────────────────────────────────────── */}
          {screen === "callback" && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <button onClick={() => setScreen("choose")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Icon name="ArrowLeft" size={18} />
                  </button>
                  <DialogTitle className="text-base font-semibold">Оставьте номер</DialogTitle>
                </div>
              </DialogHeader>

              <CallbackScreen
                eventId={eventId}
                onSuccess={() => setScreen("success")}
                onBack={() => setScreen("choose")}
              />
            </>
          )}

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

        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Экран «Перезвонить» ──────────────────────────────────────────────── */
function CallbackScreen({ eventId, onSuccess, onBack }: {
  eventId: number;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [cbName, setCbName] = useState("");
  const [cbPhone, setCbPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cbName.trim() || !cbPhone.trim()) {
      toast.error("Заполните имя и телефон");
      return;
    }
    setLoading(true);
    try {
      await signupsApi.create({
        event_id: eventId,
        name: cbName,
        phone: cbPhone,
        email: `callback_${Date.now()}@sparcom.local`,
        consent_pd: true,
      });
      onSuccess();
    } catch {
      toast.error("Не удалось отправить. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
      <p className="text-sm text-muted-foreground">
        Оставьте имя и телефон — мы перезвоним и поможем с записью.
      </p>
      <div>
        <Label htmlFor="cb-name" className="text-sm">Имя *</Label>
        <Input
          id="cb-name"
          placeholder="Как к вам обращаться"
          value={cbName}
          onChange={(e) => setCbName(e.target.value)}
          className="mt-1.5 rounded-lg"
        />
      </div>
      <div>
        <Label htmlFor="cb-phone" className="text-sm">Телефон *</Label>
        <Input
          id="cb-phone"
          type="tel"
          placeholder="+7 (___) ___-__-__"
          value={cbPhone}
          onChange={(e) => setCbPhone(e.target.value)}
          className="mt-1.5 rounded-lg"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full rounded-xl gap-2" size="lg">
        {loading
          ? <><Icon name="Loader2" size={16} className="animate-spin" /> Отправляю...</>
          : <><Icon name="Phone" size={16} /> Перезвоните мне</>
        }
      </Button>
    </form>
  );
}
