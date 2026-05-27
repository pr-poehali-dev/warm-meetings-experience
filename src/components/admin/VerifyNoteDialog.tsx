import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

interface VerifyNoteDialogProps {
  open: boolean;
  mode: "approve" | "reject";
  masterName: string;
  defaultNote?: string | null;
  processing?: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}

/**
 * Диалог подтверждения смены статуса верификации мастера.
 * - approve — необязательное приветственное сообщение.
 * - reject  — обязательная причина (минимум 3 символа), чтобы мастер понял, что исправлять.
 */
export default function VerifyNoteDialog({
  open,
  mode,
  masterName,
  defaultNote,
  processing,
  onCancel,
  onConfirm,
}: VerifyNoteDialogProps) {
  const [note, setNote] = useState(defaultNote || "");

  useEffect(() => {
    if (open) setNote(defaultNote || "");
  }, [open, defaultNote]);

  const isReject = mode === "reject";
  const canSubmit = isReject ? note.trim().length >= 3 : true;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon
              name={isReject ? "ShieldOff" : "ShieldCheck"}
              size={18}
              className={isReject ? "text-amber-600" : "text-green-600"}
            />
            {isReject ? "Снять верификацию" : "Подтвердить мастера"}
          </DialogTitle>
          <DialogDescription>
            {isReject ? (
              <>
                <b>{masterName}</b> получит уведомление в Telegram и на почту.
                Укажите, что нужно исправить.
              </>
            ) : (
              <>
                <b>{masterName}</b> получит уведомление об одобрении профиля.
                Можно добавить приветственное сообщение (необязательно).
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            isReject
              ? "Например: добавьте фото портфолио и опишите подробнее опыт"
              : "Например: добро пожаловать! Желаем тёплых встреч"
          }
          rows={4}
          maxLength={2000}
          autoFocus
        />
        {isReject && note.trim().length > 0 && note.trim().length < 3 && (
          <p className="text-xs text-destructive">Причина должна быть не короче 3 символов</p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            Отмена
          </Button>
          <Button
            onClick={() => onConfirm(note.trim())}
            disabled={!canSubmit || processing}
            variant={isReject ? "destructive" : "default"}
          >
            {processing ? (
              <Icon name="Loader2" size={14} className="mr-2 animate-spin" />
            ) : (
              <Icon name={isReject ? "ShieldOff" : "ShieldCheck"} size={14} className="mr-2" />
            )}
            {isReject ? "Снять" : "Подтвердить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
