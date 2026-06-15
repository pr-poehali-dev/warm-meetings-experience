import { useRef, useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

/**
 * Хук useConfirm — замена нативному window.confirm().
 * Возвращает [confirm, ConfirmDialogNode].
 *
 * Использование:
 *   const [confirm, ConfirmDialog] = useConfirm();
 *   // в JSX: {ConfirmDialog}
 *   // в коде: if (!(await confirm({ description: "Удалить?" }))) return;
 */
export function useConfirm(): [
  (opts: ConfirmOptions | string) => Promise<boolean>,
  React.ReactNode,
] {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ description: "" });
  const resolveRef = useRef<(value: boolean) => void>(() => {});

  const confirm = useCallback((optsOrMessage: ConfirmOptions | string): Promise<boolean> => {
    const normalized: ConfirmOptions =
      typeof optsOrMessage === "string"
        ? { description: optsOrMessage }
        : optsOrMessage;
    setOpts(normalized);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setOpen(false);
    resolveRef.current(true);
  };

  const handleCancel = () => {
    setOpen(false);
    resolveRef.current(false);
  };

  const dialog = (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{opts.title ?? "Подтвердите действие"}</AlertDialogTitle>
          {opts.description && (
            <AlertDialogDescription>{opts.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {opts.cancelLabel ?? "Отмена"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={opts.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {opts.confirmLabel ?? "Подтвердить"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirm, dialog];
}
