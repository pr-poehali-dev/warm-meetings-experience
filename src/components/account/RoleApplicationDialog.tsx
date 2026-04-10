import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/ui/icon";
import { rolesApi, Role } from "@/lib/roles-api";
import { toast } from "sonner";
import AppendixLinkModal from "@/components/AppendixLinkModal";
import { Link } from "react-router-dom";

interface Props {
  role: Role;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RoleApplicationDialog({ role, onClose, onSuccess }: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [consentRules, setConsentRules] = useState(false);
  const [consentPd, setConsentPd] = useState(false);
  const [consentEp, setConsentEp] = useState(false);

  const allRequired = consentRules && consentPd && consentEp;

  const handleSubmit = async () => {
    if (!allRequired) {
      toast.error("Необходимо принять все условия для получения статуса");
      return;
    }
    setSubmitting(true);
    try {
      const result = await rolesApi.applyForRole(role.slug, message);
      toast.success(result.message);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка отправки заявки");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{role.icon}</span>
            Статус «{role.name}»
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="text-sm text-muted-foreground">
            {role.description}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Для получения статуса необходимо:</p>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consentRules"
                checked={consentRules}
                onCheckedChange={(checked) => setConsentRules(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="consentRules" className="text-sm leading-relaxed font-normal cursor-pointer">
                Подтверждаю, что ознакомлен(а) с{" "}
                <Link
                  to="/terms#rules"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                  target="_blank"
                >
                  Правилами сообщества
                </Link>
                {" "}и обязуюсь их соблюдать (особенно разделы об алкоголе, границах, отменах)
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consentPd"
                checked={consentPd}
                onCheckedChange={(checked) => setConsentPd(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="consentPd" className="text-sm leading-relaxed font-normal cursor-pointer">
                Принимаю{" "}
                <AppendixLinkModal appendixId={3} label="Договор поручения обработки персональных данных" />
                {" "}(Приложение №3)
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consentEp"
                checked={consentEp}
                onCheckedChange={(checked) => setConsentEp(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="consentEp" className="text-sm leading-relaxed font-normal cursor-pointer">
                Принимаю{" "}
                <AppendixLinkModal appendixId={4} label="Соглашение об использовании простой электронной подписи" />
                {" "}(Приложение №4)
              </Label>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            После активации статуса с вашего Кошелька может быть списана плата за верификацию (если предусмотрено).
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Расскажите о себе</Label>
            <Textarea
              id="message"
              placeholder="Почему вы хотите получить эту роль? Ваш опыт..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !allRequired}>
            {submitting ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Отправка...
              </>
            ) : (
              "Принимаю и далее"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
