import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { SignupFromAPI } from "@/lib/api";
import { STATUS_LABELS, STATUS_COLORS } from "./signupTypes";
import AuditLogPanel from "@/components/admin/AuditLogPanel";

interface SignupSheetProps {
  selected: SignupFromAPI | null;
  editing: boolean;
  saving: boolean;
  draft: Partial<SignupFromAPI>;
  onClose: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDraftChange: (patch: Partial<SignupFromAPI>) => void;
}

export default function SignupSheet({
  selected,
  editing,
  saving,
  draft,
  onClose,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftChange,
}: SignupSheetProps) {
  return (
    <Sheet
      open={!!selected}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Icon name="User" size={18} />
            Запись #{selected?.id}
          </SheetTitle>
        </SheetHeader>

        {selected && (
          <div className="space-y-4">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>Имя</Label>
                  <Input
                    value={draft.name ?? ""}
                    onChange={(e) => onDraftChange({ name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Телефон</Label>
                  <Input
                    value={draft.phone ?? ""}
                    onChange={(e) => onDraftChange({ phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Telegram</Label>
                  <Input
                    value={draft.telegram ?? ""}
                    placeholder="@username"
                    onChange={(e) => onDraftChange({ telegram: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Статус</Label>
                  <Select
                    value={draft.status ?? selected.status}
                    onValueChange={(v) => onDraftChange({ status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Новая</SelectItem>
                      <SelectItem value="confirmed">Подтверждена</SelectItem>
                      <SelectItem value="cancelled">Отменена</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Комментарий администратора</Label>
                  <Textarea
                    value={draft.comment ?? ""}
                    rows={3}
                    placeholder="Заметки по заявке..."
                    onChange={(e) => onDraftChange({ comment: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
                  <span className="text-gray-500">Имя</span>
                  <span className="font-medium">{selected.name}</span>

                  <span className="text-gray-500">Телефон</span>
                  <a
                    href={`tel:${selected.phone}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {selected.phone}
                  </a>

                  {selected.email && (
                    <>
                      <span className="text-gray-500">Email</span>
                      <a
                        href={`mailto:${selected.email}`}
                        className="font-medium text-blue-600 hover:underline truncate"
                      >
                        {selected.email}
                      </a>
                    </>
                  )}

                  {selected.telegram && (
                    <>
                      <span className="text-gray-500">Telegram</span>
                      <a
                        href={`https://t.me/${selected.telegram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {selected.telegram}
                      </a>
                    </>
                  )}

                  {selected.event_title && (
                    <>
                      <span className="text-gray-500">Событие</span>
                      <span>{selected.event_title}</span>
                    </>
                  )}

                  {selected.event_date && (
                    <>
                      <span className="text-gray-500">Дата</span>
                      <span>{selected.event_date}</span>
                    </>
                  )}

                  <span className="text-gray-500">Статус</span>
                  <span
                    className={`inline-flex w-fit text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status] || "bg-gray-100 text-gray-800"}`}
                  >
                    {STATUS_LABELS[selected.status] || selected.status}
                  </span>

                  <span className="text-gray-500">Создана</span>
                  <span>{new Date(selected.created_at).toLocaleString("ru-RU")}</span>

                  {selected.comment && (
                    <>
                      <span className="text-gray-500">Комментарий</span>
                      <span className="text-amber-700">{selected.comment}</span>
                    </>
                  )}
                </div>

                <div className="border-t pt-4">
                  <AuditLogPanel entityType="signup" entityId={selected.id} />
                </div>
              </>
            )}
          </div>
        )}

        <SheetFooter className="gap-2 pt-4">
          {editing ? (
            <>
              <Button variant="outline" onClick={onCancelEdit} disabled={saving}>
                Отмена
              </Button>
              <Button onClick={onSaveEdit} disabled={saving}>
                {saving && (
                  <Icon name="Loader2" size={14} className="animate-spin mr-1" />
                )}
                Сохранить
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={onStartEdit}
              className="w-full sm:w-auto"
            >
              <Icon name="Pencil" size={14} className="mr-1.5" />
              Редактировать
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
