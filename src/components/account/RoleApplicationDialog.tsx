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
import { rolesApi, RoleProgress } from "@/lib/roles-api";
import { toast } from "sonner";

interface Props {
  roleProgress: RoleProgress;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RoleApplicationDialog({ roleProgress, onClose, onSuccess }: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await rolesApi.applyForRole(roleProgress.role_slug, message);
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
            <span className="text-2xl">{roleProgress.role_icon}</span>
            Заявка на роль «{roleProgress.role_name}»
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm font-medium text-green-800">Все требования выполнены</div>
            <div className="text-xs text-green-600 mt-1">
              Вы можете подать заявку на получение этой роли
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Расскажите о себе (необязательно)</Label>
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
