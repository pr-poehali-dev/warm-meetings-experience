import { useState } from "react";
import { formatPhone } from "@/hooks/usePhoneMask";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import {
  landingApi, LandingPage, ALL_BLOCKS, LandingBlockId, LandingCustomData,
} from "@/lib/landing-api";

interface Props {
  landing: LandingPage | null;
  onSaved: (l: LandingPage) => void;
}

export default function LandingBuilderTab({ landing, onSaved }: Props) {
  const cd: LandingCustomData = landing?.custom_data || {};
  const [blocks, setBlocks] = useState<LandingBlockId[]>(
    cd.blocks && cd.blocks.length > 0 ? cd.blocks : ALL_BLOCKS.map((b) => b.id)
  );
  const [hidden, setHidden] = useState<LandingBlockId[]>(cd.hidden_blocks || []);
  const [data, setData] = useState<LandingCustomData>(cd);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<LandingBlockId | null>(null);

  if (!landing) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <Icon name="Globe" size={32} className="mx-auto text-muted-foreground" />
          <h3 className="font-semibold">Сначала задайте адрес визитки</h3>
          <p className="text-sm text-muted-foreground">Перейдите на вкладку «Адрес» и выберите имя для своего мини-сайта.</p>
        </CardContent>
      </Card>
    );
  }

  const handleDragStart = (id: LandingBlockId) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, overId: LandingBlockId) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setBlocks((items) => {
      const oldIndex = items.indexOf(dragId);
      const newIndex = items.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return items;
      const copy = [...items];
      copy.splice(oldIndex, 1);
      copy.splice(newIndex, 0, dragId);
      return copy;
    });
  };
  const handleDragEnd = () => setDragId(null);

  const toggleVisible = (id: LandingBlockId) => {
    setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  };

  const updateField = <K extends keyof LandingCustomData>(key: K, value: LandingCustomData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const handlePhotoUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const { url } = await landingApi.uploadPhoto(base64, file.name);
        const newPortfolio = [...(data.portfolio || []), { url, type: "image" as const }];
        updateField("portfolio", newPortfolio);
        toast.success("Фото загружено");
      } catch {
        toast.error("Не удалось загрузить фото");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const { url } = await landingApi.uploadPhoto(base64, file.name);
        updateField("avatar_url", url);
        toast.success("Аватар обновлён");
      } catch {
        toast.error("Не удалось загрузить");
      }
    };
    reader.readAsDataURL(file);
  };

  const removePortfolioItem = (idx: number) => {
    updateField("portfolio", (data.portfolio || []).filter((_, i) => i !== idx));
  };

  const addVideoLink = () => {
    const url = window.prompt("Вставьте ссылку на видео (VK Video или RuTube)");
    if (!url) return;
    updateField("portfolio", [...(data.portfolio || []), { url, type: "video" as const }]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { landing: saved } = await landingApi.save({
        custom_data: { ...data, blocks, hidden_blocks: hidden },
      });
      onSaved(saved);
      toast.success("Сохранено");
    } catch {
      toast.error("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex gap-2">
        <Icon name="Info" size={14} className="shrink-0 mt-0.5" />
        <span>Перетаскивайте блоки за <Icon name="GripVertical" size={11} className="inline" /> чтобы менять порядок. Отключайте ненужные тумблером.</span>
      </div>

      <div className="space-y-3">
        {blocks.map((id) => (
          <SortableBlock
            key={id}
            id={id}
            hidden={hidden.includes(id)}
            onToggle={() => toggleVisible(id)}
            data={data}
            updateField={updateField}
            onAvatarUpload={handleAvatarUpload}
            onPhotoUpload={handlePhotoUpload}
            onAddVideo={addVideoLink}
            onRemovePortfolio={removePortfolioItem}
            onDragStart={() => handleDragStart(id)}
            onDragOver={(e) => handleDragOver(e, id)}
            onDragEnd={handleDragEnd}
            isDragging={dragId === id}
          />
        ))}
      </div>

      <div className="sticky bottom-3 z-10 bg-background pt-2">
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Icon name="Loader2" size={16} className="animate-spin mr-2" /> : <Icon name="Save" size={16} className="mr-2" />}
          Сохранить визитку
        </Button>
      </div>
    </div>
  );
}

interface SortableBlockProps {
  id: LandingBlockId;
  hidden: boolean;
  onToggle: () => void;
  data: LandingCustomData;
  updateField: <K extends keyof LandingCustomData>(k: K, v: LandingCustomData[K]) => void;
  onAvatarUpload: (f: File) => void;
  onPhotoUpload: (f: File) => void;
  onAddVideo: () => void;
  onRemovePortfolio: (idx: number) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function SortableBlock({ id, hidden, onToggle, data, updateField, onAvatarUpload, onPhotoUpload, onAddVideo, onRemovePortfolio, onDragStart, onDragOver, onDragEnd, isDragging }: SortableBlockProps) {
  const meta = ALL_BLOCKS.find((b) => b.id === id)!;
  const [open, setOpen] = useState(false);
  const [grabbing, setGrabbing] = useState(false);

  return (
    <Card
      draggable={grabbing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={() => { onDragEnd(); setGrabbing(false); }}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={hidden ? "opacity-60" : ""}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <button
            onMouseDown={() => setGrabbing(true)}
            onMouseUp={() => setGrabbing(false)}
            onTouchStart={() => setGrabbing(true)}
            onTouchEnd={() => setGrabbing(false)}
            className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1.5"
          >
            <Icon name="GripVertical" size={16} />
          </button>
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <Icon name={meta.icon} size={16} className="text-orange-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{meta.label}</div>
            <div className="text-xs text-muted-foreground truncate">{meta.desc}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            <Icon name={open ? "ChevronUp" : "ChevronDown"} size={16} />
          </Button>
          <Switch checked={!hidden} onCheckedChange={onToggle} />
        </div>

        {open && !hidden && (
          <div className="mt-3 pt-3 border-t space-y-3">
            <BlockEditor id={id} data={data} updateField={updateField} onAvatarUpload={onAvatarUpload} onPhotoUpload={onPhotoUpload} onAddVideo={onAddVideo} onRemovePortfolio={onRemovePortfolio} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BlockEditor({ id, data, updateField, onAvatarUpload, onPhotoUpload, onAddVideo, onRemovePortfolio }: Omit<SortableBlockProps, "hidden" | "onToggle">) {
  const c = data.contacts || {};
  const s = data.social || {};

  if (id === "avatar_name") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {data.avatar_url ? (
            <img src={data.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center"><Icon name="User" size={20} /></div>
          )}
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAvatarUpload(e.target.files[0])} />
            <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70"><Icon name="Upload" size={14} /> Загрузить фото</span>
          </label>
        </div>
        <div>
          <Label className="text-xs">Имя/название</Label>
          <Input value={data.display_name || ""} onChange={(e) => updateField("display_name", e.target.value)} placeholder="Дмитрий Чикин" />
        </div>
        <div>
          <Label className="text-xs">Подзаголовок</Label>
          <Input value={data.tagline || ""} onChange={(e) => updateField("tagline", e.target.value)} placeholder="Пармастер · стаж 7 лет" />
        </div>
      </div>
    );
  }

  if (id === "about_text") {
    return (
      <div>
        <Label className="text-xs">Текст о себе (до 1000 символов)</Label>
        <Textarea
          value={data.about_text || ""}
          onChange={(e) => updateField("about_text", e.target.value.slice(0, 1000))}
          rows={5}
          placeholder="Расскажите о себе..."
        />
        <div className="text-xs text-muted-foreground mt-1">{(data.about_text || "").length} / 1000</div>
      </div>
    );
  }

  if (id === "portfolio") {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {(data.portfolio || []).map((item, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
              {item.type === "image" ? (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black/80"><Icon name="Play" size={20} className="text-white" /></div>
              )}
              <button onClick={() => onRemovePortfolio(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center">
                <Icon name="X" size={12} />
              </button>
            </div>
          ))}
          {(data.portfolio || []).length < 10 && (
            <label className="cursor-pointer aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted/40">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhotoUpload(e.target.files[0])} />
              <Icon name="Plus" size={20} />
              <span>Фото</span>
            </label>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onAddVideo} className="gap-1.5">
          <Icon name="Link" size={14} /> Добавить видео-ссылку (VK / RuTube)
        </Button>
      </div>
    );
  }

  if (id === "contacts") {
    return (
      <div className="grid sm:grid-cols-2 gap-2">
        <div><Label className="text-xs">Телефон</Label><Input type="tel" value={c.phone || ""} onChange={(e) => updateField("contacts", { ...c, phone: formatPhone(e.target.value) })} placeholder="+7(___) ___-__-__" /></div>
        <div><Label className="text-xs">Email</Label><Input value={c.email || ""} onChange={(e) => updateField("contacts", { ...c, email: e.target.value })} /></div>
        <div><Label className="text-xs">Telegram</Label><Input value={c.telegram || ""} onChange={(e) => updateField("contacts", { ...c, telegram: e.target.value })} placeholder="@username" /></div>
        <div><Label className="text-xs">WhatsApp</Label><Input value={c.whatsapp || ""} onChange={(e) => updateField("contacts", { ...c, whatsapp: e.target.value })} /></div>
        <div><Label className="text-xs">VK</Label><Input value={c.vk || ""} onChange={(e) => updateField("contacts", { ...c, vk: e.target.value })} placeholder="vk.com/..." /></div>
        <div><Label className="text-xs">Instagram</Label><Input value={c.instagram || ""} onChange={(e) => updateField("contacts", { ...c, instagram: e.target.value })} /></div>
      </div>
    );
  }

  if (id === "map") {
    return (
      <div>
        <Label className="text-xs">Адрес</Label>
        <Input value={data.map_address || ""} onChange={(e) => updateField("map_address", e.target.value)} placeholder="Москва, ул. Ленина 1" />
        <p className="text-xs text-muted-foreground mt-1">Если у вас есть баня — адрес подтянется автоматически.</p>
      </div>
    );
  }

  if (id === "cta") {
    return (
      <div className="space-y-2">
        <div><Label className="text-xs">Заголовок кнопки</Label><Input value={data.cta_title || ""} onChange={(e) => updateField("cta_title", e.target.value)} placeholder="Записаться" /></div>
        <div><Label className="text-xs">Подзаголовок</Label><Input value={data.cta_description || ""} onChange={(e) => updateField("cta_description", e.target.value)} placeholder="Оставьте контакт..." /></div>
      </div>
    );
  }

  if (id === "social") {
    return (
      <div className="grid sm:grid-cols-2 gap-2">
        <div><Label className="text-xs">Telegram</Label><Input value={s.telegram || ""} onChange={(e) => updateField("social", { ...s, telegram: e.target.value })} /></div>
        <div><Label className="text-xs">VK</Label><Input value={s.vk || ""} onChange={(e) => updateField("social", { ...s, vk: e.target.value })} /></div>
        <div><Label className="text-xs">YouTube</Label><Input value={s.youtube || ""} onChange={(e) => updateField("social", { ...s, youtube: e.target.value })} /></div>
        <div><Label className="text-xs">Instagram</Label><Input value={s.instagram || ""} onChange={(e) => updateField("social", { ...s, instagram: e.target.value })} /></div>
      </div>
    );
  }

  if (id === "services") {
    return <p className="text-xs text-muted-foreground">Услуги подтягиваются из вашего профиля мастера автоматически. Добавлять/редактировать их можно в разделе «Мастер · Профиль».</p>;
  }

  if (id === "reviews") {
    return <p className="text-xs text-muted-foreground">Отзывы подтягиваются автоматически из вашего профиля мастера.</p>;
  }

  return null;
}