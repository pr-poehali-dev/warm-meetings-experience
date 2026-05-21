/**
 * Модалка «Задать вопрос организатору» для страницы события.
 * Доступна гостям. Авторизованным — автозаполнение имени/контакта.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { eventQuestionsApi } from "@/lib/api";
import BathCaptcha, { useBathCaptcha } from "@/components/BathCaptcha";

interface AskOrganizerModalProps {
  eventId: number;
  eventTitle: string;
  organizerName?: string | null;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

type ContactType = "email" | "phone" | "telegram";

export default function AskOrganizerModal({
  eventId,
  eventTitle,
  organizerName,
  variant = "outline",
  size = "default",
  className,
}: AskOrganizerModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [contactType, setContactType] = useState<ContactType>("email");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const captcha = useBathCaptcha();

  useEffect(() => {
    if (open && user) {
      setName((prev) => prev || user.name || "");
      if (user.email) {
        setContact((prev) => prev || user.email || "");
        setContactType("email");
      } else if (user.phone) {
        setContact((prev) => prev || user.phone || "");
        setContactType("phone");
      }
    }
  }, [open, user]);

  const reset = () => {
    setSent(false);
    setMessage("");
    captcha.reset();
  };

  const handleClose = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const validateContact = (type: ContactType, value: string): string | null => {
    const v = value.trim();
    if (!v) return "Укажите контакт";
    if (type === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Неверный формат email";
      return null;
    }
    if (type === "phone") {
      const digits = v.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) return "Введите телефон полностью";
      return null;
    }
    const clean = v.replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{3,32}$/.test(clean)) return "Никнейм 3–32 символа, латиница/цифры/_";
    return null;
  };

  const contactError = contact.trim() ? validateContact(contactType, contact) : null;

  const canSubmit =
    name.trim().length >= 2 &&
    contact.trim().length >= 3 &&
    !validateContact(contactType, contact) &&
    message.trim().length >= 5 &&
    (user ? true : captcha.isValid);

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      await eventQuestionsApi.ask({
        event_id: eventId,
        name: name.trim(),
        contact: contact.trim(),
        contact_type: contactType,
        message: message.trim(),
      });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось отправить вопрос");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          type="button"
        >
          <Icon name="MessageCircleQuestion" size={16} />
          Задать вопрос
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {sent ? "Вопрос отправлен" : "Вопрос организатору"}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <Icon name="CheckCircle2" size={28} className="text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              {organizerName
                ? `${organizerName} получит ваш вопрос на email и свяжется с вами по указанному контакту.`
                : "Организатор получит ваш вопрос и свяжется с вами по указанному контакту."}
            </p>
            <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
              Готово
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground border border-amber-200 bg-amber-50/60 rounded-lg p-2.5 flex gap-2">
              <Icon name="Info" size={14} className="text-amber-700 shrink-0 mt-0.5" />
              <span>
                Вопрос по событию <b>«{eventTitle}»</b>
                {organizerName ? ` — для ${organizerName}` : ""}.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ask-name" className="text-xs">
                Как к вам обращаться
              </Label>
              <Input
                id="ask-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Имя"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Как с вами связаться</Label>
              <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                {(["email", "phone", "telegram"] as ContactType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setContactType(t)}
                    className={`text-xs py-1.5 px-2 rounded-md border transition-colors ${
                      contactType === t
                        ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/30"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    {t === "email" ? "Email" : t === "phone" ? "Телефон" : "Telegram"}
                  </button>
                ))}
              </div>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                inputMode={
                  contactType === "email"
                    ? "email"
                    : contactType === "phone"
                      ? "tel"
                      : "text"
                }
                placeholder={
                  contactType === "email"
                    ? "you@example.com"
                    : contactType === "phone"
                      ? "+7 999 123-45-67"
                      : "@username"
                }
                aria-invalid={!!contactError}
                className={contactError ? "border-red-400 focus-visible:ring-red-300" : ""}
              />
              {contactError && (
                <p className="text-[11px] text-red-600 flex items-center gap-1">
                  <Icon name="AlertCircle" size={11} />
                  {contactError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ask-message" className="text-xs">
                Ваш вопрос
              </Label>
              <Textarea
                id="ask-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Например: возьму ли я ребёнка, нужны ли тапочки, есть ли парковка..."
              />
            </div>

            {!user && <BathCaptcha {...captcha} />}

            <Button
              onClick={submit}
              disabled={!canSubmit || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  Отправляем...
                </>
              ) : (
                <>
                  <Icon name="Send" size={16} />
                  Отправить вопрос
                </>
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Организатор получит уведомление на email и ответит вам по указанному контакту.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}