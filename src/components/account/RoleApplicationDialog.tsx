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
import Icon from "@/components/ui/icon";
import { rolesApi, Role } from "@/lib/roles-api";
import { toast } from "sonner";

interface Props {
  role: Role;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RoleApplicationDialog({ role, onClose, onSuccess }: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{role.icon}</span>
            Заявка на роль «{role.name}»
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {role.description}
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
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Отправка...
              </>
            ) : (
              "Отправить заявку"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
