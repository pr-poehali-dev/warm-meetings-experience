import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Icon from "@/components/ui/icon";
import AuditLogPanel from "@/components/admin/AuditLogPanel";
import { AdminMaster } from "./MasterCard";

const SPEC_ICONS: Record<string, string> = {
  parilshchik: "Flame",
  "venik-master": "Leaf",
  massazhist: "Hand",
  aromaterapeut: "Wind",
  instruktor: "BookOpen",
  "bar-master": "Coffee",
};

interface MasterDetailSheetProps {
  selected: AdminMaster | null;
  detailLoading: boolean;
  processing: number | null;
  onClose: () => void;
  onVerify: (id: number, is_verified: boolean) => void;
  onToggleActive: (id: number, is_active: boolean) => void;
}

export default function MasterDetailSheet({
  selected,
  detailLoading,
  processing,
  onClose,
  onVerify,
  onToggleActive,
}: MasterDetailSheetProps) {
  return (
    <Sheet open={!!selected} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        {selected && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2">
                {selected.is_verified && (
                  <Icon name="ShieldCheck" size={18} className="text-green-600" />
                )}
                {selected.name}
              </SheetTitle>
            </SheetHeader>

            {detailLoading && (
              <div className="flex justify-center py-6">
                <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
              </div>
            )}

            <div className="space-y-5">
              {/* Аватар + базовые данные */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-muted flex-shrink-0 overflow-hidden">
                  {selected.avatar ? (
                    <img src={selected.avatar} alt={selected.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon name="User" size={28} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-1.5">
                    {selected.is_verified && (
                      <Badge className="bg-green-600 text-white text-xs">
                        <Icon name="ShieldCheck" size={11} className="mr-1" />Верифицирован
                      </Badge>
                    )}
                    {!selected.is_verified && selected.is_active && (
                      <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
                        <Icon name="Clock" size={11} className="mr-1" />Ожидает проверки
                      </Badge>
                    )}
                    {!selected.is_active && (
                      <Badge variant="secondary" className="text-xs">Скрыт админом</Badge>
                    )}
                    {selected.is_active && selected.hidden_by_owner && (
                      <Badge
                        variant="outline"
                        className="text-xs border-zinc-300 text-zinc-600 bg-zinc-50"
                      >
                        <Icon name="EyeOff" size={11} className="mr-1" />
                        Скрыт мастером
                      </Badge>
                    )}
                  </div>
                  {(selected.verification_note || selected.verified_at || selected.verification_requested_at) && (
                    <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-1">
                      {selected.verification_note && (
                        <div>
                          <span className="font-medium">Заметка админа:</span>{" "}
                          <span className="text-muted-foreground">{selected.verification_note}</span>
                        </div>
                      )}
                      {selected.verified_at && (
                        <div className="text-muted-foreground">
                          Одобрен: {new Date(selected.verified_at).toLocaleString("ru-RU")}
                        </div>
                      )}
                      {selected.verification_requested_at && !selected.is_verified && (
                        <div className="text-muted-foreground">
                          Заявка обновлена: {new Date(selected.verification_requested_at).toLocaleString("ru-RU")}
                        </div>
                      )}
                    </div>
                  )}
                  {selected.tagline && (
                    <p className="text-sm italic text-muted-foreground">«{selected.tagline}»</p>
                  )}
                  {selected.rating > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Icon name="Star" size={14} className="text-amber-400" />
                      <span className="font-medium">{selected.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({selected.reviews_count} отзывов)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Контакты */}
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm border-t pt-4">
                {selected.city && (
                  <>
                    <span className="text-muted-foreground">Город</span>
                    <span>{selected.city}</span>
                  </>
                )}
                {selected.experience_years > 0 && (
                  <>
                    <span className="text-muted-foreground">Опыт</span>
                    <span>{selected.experience_years} лет</span>
                  </>
                )}
                {selected.price_from > 0 && (
                  <>
                    <span className="text-muted-foreground">Цена от</span>
                    <span>{selected.price_from.toLocaleString("ru")} ₽</span>
                  </>
                )}
                {selected.phone && (
                  <>
                    <span className="text-muted-foreground">Телефон</span>
                    <a href={`tel:${selected.phone}`} className="text-blue-600 hover:underline">
                      {selected.phone}
                    </a>
                  </>
                )}
                {selected.telegram && (
                  <>
                    <span className="text-muted-foreground">Telegram</span>
                    <a
                      href={`https://t.me/${selected.telegram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      @{selected.telegram.replace("@", "")}
                    </a>
                  </>
                )}
                {selected.instagram && (
                  <>
                    <span className="text-muted-foreground">Instagram</span>
                    <a
                      href={`https://instagram.com/${selected.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      @{selected.instagram.replace("@", "")}
                    </a>
                  </>
                )}
                <span className="text-muted-foreground">Добавлен</span>
                <span>{new Date(selected.created_at).toLocaleDateString("ru-RU")}</span>
              </div>

              {/* О себе */}
              {selected.bio && (
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">О себе</p>
                  <p className="text-sm whitespace-pre-line">{selected.bio}</p>
                </div>
              )}

              {/* Специализации */}
              {selected.specializations && selected.specializations.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Специализации</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.specializations.map((s) => (
                      <Badge key={s.id} variant="secondary" className="text-xs flex items-center gap-1">
                        <Icon name={SPEC_ICONS[s.slug] || "Sparkles"} size={11} />
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Фото */}
              {selected.photos && selected.photos.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Фотографии
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selected.photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt=""
                          className="w-full aspect-square object-cover rounded-lg hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Бани */}
              {selected.baths && selected.baths.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Работает в банях
                  </p>
                  <div className="space-y-1.5">
                    {selected.baths.map((b) => (
                      <div key={b.id} className="text-sm flex items-center gap-2">
                        <Icon name="Building2" size={13} className="text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{b.name}</span>
                        {b.city && <span className="text-muted-foreground">· {b.city}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ссылка на публичный профиль */}
              {selected.is_active && (
                <div className="border-t pt-4">
                  <a
                    href={`/masters/${selected.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                  >
                    <Icon name="ExternalLink" size={14} />
                    Публичный профиль
                  </a>
                </div>
              )}

              {/* Кнопки верификации */}
              <div className="border-t pt-4 flex flex-wrap gap-2">
                {!selected.is_verified ? (
                  <Button
                    onClick={() => onVerify(selected.id, true)}
                    disabled={processing === selected.id}
                  >
                    {processing === selected.id ? (
                      <Icon name="Loader2" size={15} className="animate-spin mr-2" />
                    ) : (
                      <Icon name="ShieldCheck" size={15} className="mr-2" />
                    )}
                    Верифицировать
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => onVerify(selected.id, false)}
                    disabled={processing === selected.id}
                  >
                    <Icon name="ShieldOff" size={15} className="mr-2" />
                    Снять верификацию
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => onToggleActive(selected.id, !selected.is_active)}
                  disabled={processing === selected.id}
                >
                  <Icon name={selected.is_active ? "EyeOff" : "Eye"} size={15} className="mr-2" />
                  {selected.is_active ? "Скрыть" : "Показать"}
                </Button>
              </div>

              {/* История изменений */}
              <div className="border-t pt-4">
                <AuditLogPanel entityType="master" entityId={selected.id} />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}