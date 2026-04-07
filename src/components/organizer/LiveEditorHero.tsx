import { useState } from "react";
import { OrgEvent } from "@/lib/organizer-api";
import Icon from "@/components/ui/icon";
import { getTypeColors } from "@/data/events";
import ImageUpload from "@/components/admin/ImageUpload";

const BASE_EVENT_TYPES = [
  { value: "знакомство", label: "Знакомство", icon: "Users" },
  { value: "свидание", label: "Свидание", icon: "Heart" },
  { value: "обучение", label: "Обучение", icon: "GraduationCap" },
  { value: "встреча", label: "Встреча", icon: "Coffee" },
  { value: "вечеринка", label: "Вечеринка", icon: "PartyPopper" },
  { value: "спорт", label: "Спорт", icon: "Dumbbell" },
  { value: "другое", label: "Другое", icon: "Circle" },
];

interface Props {
  fd: OrgEvent;
  set: (patch: Partial<OrgEvent>) => void;
}

export default function LiveEditorHero({ fd, set }: Props) {
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const typeColors = getTypeColors(fd.event_type || "знакомство");
  const typeIcon = fd.event_type_icon || "Users";
  const typeLabel = fd.event_type || "знакомство";

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

        {/* image change button */}
        <button
          type="button"
          onClick={() => setShowImageUpload(!showImageUpload)}
          className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
        >
          <Icon name="Camera" size={13} />
          {fd.image_url ? "Сменить фото" : "Добавить фото"}
        </button>
      </div>

      {/* Type selector dropdown */}
      {showTypeSelector && (
        <div className="border rounded-b-lg bg-background shadow-md p-3 mb-0 z-10 relative">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Тип мероприятия</p>
          <div className="flex flex-wrap gap-2">
            {BASE_EVENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  set({ event_type: t.value, event_type_icon: t.icon });
                  setShowTypeSelector(false);
                }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  fd.event_type === t.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                <Icon name={t.icon} size={13} />
                {t.label}
              </button>
            ))}
          </div>
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
