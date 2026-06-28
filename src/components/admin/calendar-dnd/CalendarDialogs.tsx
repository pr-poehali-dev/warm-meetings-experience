import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { MasterBooking, MasterBackup } from "@/lib/master-calendar-api";

// ─── ConfirmBar ────────────────────────────────────────────────────────────────

export function ConfirmBar({
  title,
  oldText,
  newText,
  onConfirm,
  onCancel,
}: {
  title: string;
  oldText: string;
  newText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-xl shadow-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 w-[calc(100%-2rem)] max-w-sm sm:max-w-none sm:min-w-[300px]">
      <div className="flex-1">
        <div className="font-semibold text-sm">{title}</div>
        {oldText && <div className="text-xs text-muted-foreground">Было: {oldText}</div>}
        <div className="text-xs text-foreground">Стало: {newText}</div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 sm:flex-none" onClick={onConfirm}>Подтвердить</Button>
        <Button size="sm" variant="ghost" className="flex-1 sm:flex-none" onClick={onCancel}>Отмена</Button>
      </div>
    </div>
  );
}

// ─── CancelBookingDialog ───────────────────────────────────────────────────────

export function CancelBookingDialog({
  open,
  onConfirm,
  onClose,
}: {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-card border rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-100 p-2 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div className="font-semibold text-sm">Отменить запись?</div>
            <div className="text-xs text-muted-foreground mt-1">Запись будет отменена и перенесена в корзину. Вы сможете восстановить её через «Корзину».</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" className="flex-1" onClick={onConfirm}>Да, отменить</Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>Назад</Button>
        </div>
      </div>
    </div>
  );
}

// ─── ClearCalendarDialog ───────────────────────────────────────────────────────

const CLEAR_OPTIONS: { scope: "week" | "future" | "all"; icon: string; title: string; hint: string; danger?: boolean }[] = [
  { scope: "week", icon: "Calendar", title: "Только текущий период", hint: "То, что видно сейчас" },
  { scope: "future", icon: "CalendarClock", title: "Сегодня и далее", hint: "История сохранится" },
  { scope: "all", icon: "Trash2", title: "Полностью весь календарь", hint: "Включая историю", danger: true },
];

export function ClearCalendarDialog({
  open, clearing, onClose, onClear,
}: {
  open: boolean;
  clearing: boolean;
  onClose: () => void;
  onClear: (scope: "all" | "week" | "future") => void;
}) {
  const [pending, setPending] = useState<"all" | "week" | "future" | null>(null);
  useEffect(() => {
    if (!open) setPending(null);
  }, [open]);
  if (!open) return null;

  const close = () => { if (!clearing) onClose(); };
  const chosen = CLEAR_OPTIONS.find((o) => o.scope === pending);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={close}>
      <div className="bg-card border rounded-2xl shadow-xl p-5 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Icon name="AlertTriangle" size={20} className="text-amber-500" />
          <div className="font-semibold text-lg">Очистить календарь</div>
        </div>

        {!pending ? (
          <>
            <div className="text-sm text-muted-foreground">
              Слоты и блокировки будут удалены. Записи клиентов попадут в корзину и сохранятся в резервную копию — их можно восстановить.
            </div>
            <div className="grid grid-cols-1 gap-2">
              {CLEAR_OPTIONS.map((o) => (
                <button
                  key={o.scope}
                  disabled={clearing}
                  onClick={() => setPending(o.scope)}
                  className={
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors text-left disabled:opacity-50 " +
                    (o.danger
                      ? "border-red-300 hover:bg-red-50 text-red-700"
                      : "hover:bg-muted/50")
                  }
                >
                  <Icon name={o.icon} size={16} />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{o.title}</div>
                    <div className="text-xs text-muted-foreground">{o.hint}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={close} disabled={clearing}>Отмена</Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm">
              Вы выбрали: <span className="font-semibold">{chosen?.title}</span>.
              <div className="text-muted-foreground mt-1">
                Записи клиентов будут перемещены в корзину (не удалены безвозвратно). Подтвердить очистку?
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setPending(null)} disabled={clearing}>Назад</Button>
              <Button
                variant="destructive"
                onClick={() => pending && onClear(pending)}
                disabled={clearing}
                className="gap-1.5"
              >
                {clearing && <Icon name="Loader2" size={15} className="animate-spin" />}
                Очистить
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── TrashDialog ───────────────────────────────────────────────────────────────

export function TrashDialog({
  open, loading, bookings, backups, restoring,
  onClose, onRestoreAll, onRestoreOne, onBackupNow, formatDt,
}: {
  open: boolean;
  loading: boolean;
  bookings: MasterBooking[];
  backups: MasterBackup[];
  restoring: boolean;
  onClose: () => void;
  onRestoreAll: () => void;
  onRestoreOne: (bookingId: number) => void;
  onBackupNow: () => void;
  formatDt: (iso: string) => string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card border rounded-2xl shadow-xl p-5 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Icon name="Archive" size={20} className="text-primary" />
          <div className="font-semibold text-lg">Корзина и резервные копии</div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Icon name="Loader2" size={16} className="animate-spin" /> Загрузка…
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Удалённые записи ({bookings.length})</div>
                {bookings.length > 0 && (
                  <Button size="sm" onClick={onRestoreAll} disabled={restoring} className="gap-1.5">
                    {restoring && <Icon name="Loader2" size={14} className="animate-spin" />}
                    Восстановить все
                  </Button>
                )}
              </div>
              {bookings.length === 0 ? (
                <div className="text-xs text-muted-foreground">Корзина пуста.</div>
              ) : (
                <div className="space-y-1.5">
                  {bookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg border text-sm">
                      <Icon name="User" size={14} className="text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{b.client_name}</div>
                        <div className="text-xs text-muted-foreground">{formatDt(b.datetime_start)} · {b.client_phone}</div>
                      </div>
                      {b.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 shrink-0 h-8"
                          disabled={restoring}
                          onClick={() => onRestoreOne(b.id!)}
                        >
                          <Icon name="RotateCcw" size={13} />
                          <span className="hidden sm:inline">Восстановить</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Резервные копии ({backups.length})</div>
                <Button size="sm" variant="outline" onClick={onBackupNow} className="gap-1.5">
                  <Icon name="Save" size={14} /> Создать копию
                </Button>
              </div>
              {backups.length === 0 ? (
                <div className="text-xs text-muted-foreground">Копий пока нет.</div>
              ) : (
                <div className="space-y-1.5">
                  {backups.map((bk) => (
                    <div key={bk.id} className="flex items-center gap-2 p-2 rounded-lg border text-sm">
                      <Icon name="FileArchive" size={14} className="text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{bk.bookings_count} записей · {bk.reason === "clear" ? "перед очисткой" : "вручную"}</div>
                        <div className="text-xs text-muted-foreground">{formatDt(bk.created_at)}</div>
                      </div>
                      {bk.file_url && (
                        <a href={bk.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                          <Icon name="Download" size={13} /> Скачать
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="ghost" onClick={onClose}>Закрыть</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
