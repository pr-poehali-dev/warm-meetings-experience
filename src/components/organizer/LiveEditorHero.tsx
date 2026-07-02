import { useState } from "react";
import { OrgEvent } from "@/lib/organizer-api";
import Icon from "@/components/ui/icon";
import { getTypeColors } from "@/data/events";
import ImageUpload from "@/components/admin/ImageUpload";
import PhotoBank, { useRecentPhotos } from "@/components/admin/PhotoBank";
import { useEventTypes } from "@/hooks/useEventTypes";
import { Input } from "@/components/ui/input";
import SensitiveFieldBadge from "./SensitiveFieldBadge";

interface Props {
  fd: OrgEvent;
  set: (patch: Partial<OrgEvent>) => void;
  showSensitive?: boolean;
}

export default function LiveEditorHero({ fd, set, showSensitive = false }: Props) {
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showPhotoBank, setShowPhotoBank] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customParentType, setCustomParentType] = useState('');
  const { addRecent } = useRecentPhotos();
  const { types } = useEventTypes();

  const typeColors = getTypeColors(fd.event_type || "знакомство");
  const typeIcon = fd.event_type_icon || "Users";
  const typeLabel = types.find(t => t.value === fd.event_type)?.label || fd.event_type || "знакомство";

  return (
    <>
      {/* ── HERO IMAGE ── */}
      <div
        className="relative mb-0 rounded-t-2xl overflow-hidden bg-muted group"
        style={{ minHeight: fd.image_url ? undefined : "180px" }}
      >
        {fd.image_url ? (
          <>
            <img src={fd.image_url} alt="" className="w-full h-56 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </>
        ) : (
          <div className="w-full h-44 flex flex-col items-center justify-center gap-2 bg-muted">
            <Icon name="Image" size={36} className="text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground">Нажмите, чтобы добавить обложку</span>
          </div>
        )}

        {/* Overlay type badge */}
        <div className="absolute top-3 left-3">
          <button
            type="button"
            onClick={() => setShowTypeSelector(!showTypeSelector)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium ${typeColors.bg} ${typeColors.color} flex items-center gap-1 hover:opacity-80 transition-opacity`}
          >
            <Icon name={typeIcon} size={12} />
            {typeLabel}
            <Icon name="ChevronDown" size={11} className="ml-0.5" />
          </button>
        </div>

        {/* Бейдж «требует модерации» для обложки */}
        {showSensitive && (
          <div className="absolute top-3 right-3">
            <SensitiveFieldBadge />
          </div>
        )}

        {/* Кнопки фото */}
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          <button
            type="button"
            onClick={() => { setShowPhotoBank(!showPhotoBank); setShowImageUpload(false); }}
            className="bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
          >
            <Icon name="Images" size={13} />
            Банк фото
          </button>
          <button
            type="button"
            onClick={() => { setShowImageUpload(!showImageUpload); setShowPhotoBank(false); }}
            className="bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
          >
            <Icon name="Upload" size={13} />
            {fd.image_url ? "Своё фото" : "Загрузить"}
          </button>
        </div>
      </div>

      {/* Type selector dropdown */}
      {showTypeSelector && (
        <div className="border rounded-b-lg bg-background shadow-md p-4 mb-0 z-10 relative">
          <p className="text-xs text-muted-foreground mb-3 font-medium">Тип мероприятия</p>
          <div className="grid grid-cols-3 gap-2">
            {types.filter(t => t.value !== 'другое').map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  set({ event_type: t.value, event_type_icon: t.icon, event_parent_type: null });
                  setShowTypeSelector(false);
                  setShowCustomInput(false);
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  fd.event_type === t.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                <Icon name={t.icon as "Flame"} size={20} />
                <span className="text-xs font-medium leading-tight text-center">{t.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border border-dashed transition-all ${
                showCustomInput ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              <Icon name="Plus" size={20} />
              <span className="text-xs font-medium">Свой тип</span>
            </button>
          </div>
          {showCustomInput && (
            <div className="mt-3 space-y-2 border-t pt-3">
              <p className="text-xs text-muted-foreground">Название вашего типа</p>
              <Input
                className="h-8 text-xs"
                placeholder="Например: Женская баня, Детокс..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                maxLength={100}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Родительский тип (для фильтрации)</p>
              <div className="flex flex-wrap gap-1.5">
                {types.filter(t => t.value !== 'другое').map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setCustomParentType(customParentType === t.value ? '' : t.value)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      customParentType === t.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Icon name={t.icon as "Flame"} size={11} />
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!customInput.trim()}
                onClick={() => {
                  if (customInput.trim()) {
                    const parentIcon = types.find(t => t.value === customParentType)?.icon || 'Circle';
                    set({ event_type: customInput.trim(), event_type_icon: parentIcon, event_parent_type: customParentType || null });
                    setShowTypeSelector(false);
                    setShowCustomInput(false);
                    setCustomInput('');
                    setCustomParentType('');
                  }
                }}
                className="w-full text-xs py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Применить
              </button>
            </div>
          )}
        </div>
      )}

      {/* Панель фотобанка */}
      {showPhotoBank && (
        <div className="border border-border rounded-lg p-4 mb-3 bg-background shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Icon name="Images" size={15} />
              Фотобанк — выберите обложку
            </p>
            <button
              type="button"
              onClick={() => setShowPhotoBank(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="X" size={16} />
            </button>
          </div>
          <PhotoBank
            currentUrl={fd.image_url}
            onSelect={(url) => {
              addRecent(url);
              set({ image_url: url });
              setShowPhotoBank(false);
            }}
            onClose={() => setShowPhotoBank(false)}
          />
        </div>
      )}

      {/* Image upload panel */}
      {showImageUpload && (
        <div className="border rounded-lg p-4 mb-3 bg-background shadow-sm">
          <ImageUpload
            currentImageUrl={fd.image_url}
            onImageUploaded={(url) => {
              set({ image_url: url });
              setShowImageUpload(false);
            }}
          />
        </div>
      )}
    </>
  );
}