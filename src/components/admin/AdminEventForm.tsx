import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { PricingTier } from "@/lib/organizer-api";
import Icon from "@/components/ui/icon";
import EventFormBasicFields from "./EventFormBasicFields";
import EventFormTypeSelector from "./EventFormTypeSelector";
import EventFormPricingSection from "./EventFormPricingSection";
import ImageUpload from "./ImageUpload";

interface Event {
  id?: number;
  title: string;
  short_description: string;
  full_description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  occupancy: string;
  price: string;
  event_type: string;
  event_type_icon: string;
  image_url: string;
  is_visible: boolean;
  bath_name?: string;
  bath_address?: string;
  description?: string;
  program?: string[];
  rules?: string[];
  pricing_lines?: string[];
  pricing_type?: "fixed" | "dynamic";
  pricing_tiers?: PricingTier[];
  price_amount?: number;
  price_label?: string;
  total_spots?: number;
  spots_left?: number;
  featured?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AdminEventFormProps {
  formData: Event;
  loading: boolean;
  onFormChange: (data: Event) => void;
  onSubmit: (e: React.FormEvent, saveAndNew: boolean) => void;
  onCancel: () => void;
}

/* ────────────────────── Section wrapper ────────────────────── */

interface FormSectionProps {
  id: string;
  icon: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  collapsible?: boolean;
  completed?: boolean;
  children: React.ReactNode;
}

function FormSection({
  icon,
  title,
  isOpen,
  onToggle,
  collapsible = true,
  completed = false,
  children,
}: FormSectionProps) {
  return (
    <Card className="overflow-hidden">
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/50 transition-colors"
        >
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg ${
              completed
                ? "bg-green-100 text-green-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {completed ? (
              <Icon name="Check" size={16} />
            ) : (
              <Icon name={icon} size={16} />
            )}
          </div>
          <span className="flex-1 font-medium text-sm">{title}</span>
          <Icon
            name="ChevronDown"
            size={18}
            className={`text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      ) : (
        <div className="flex items-center gap-3 px-5 py-4">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg ${
              completed
                ? "bg-green-100 text-green-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {completed ? (
              <Icon name="Check" size={16} />
            ) : (
              <Icon name={icon} size={16} />
            )}
          </div>
          <span className="flex-1 font-medium text-sm">{title}</span>
        </div>
      )}

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-0 pb-5 px-5">
            <div className="border-t pt-4">{children}</div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

/* ────────────────────── Main form ────────────────────── */

const AdminEventForm = ({
  formData,
  loading,
  onFormChange,
  onSubmit,
  onCancel,
}: AdminEventFormProps) => {
  const isEditing = Boolean(formData.id);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    datetime: false,
    location: false,
    cover: false,
    pricing: false,
    program: false,
    publish: true,
  });

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /* ── completion checks ── */
  const sectionComplete = useMemo(() => {
    const fd = formData;
    return {
      basic: Boolean(fd.title?.trim()),
      datetime: Boolean(fd.event_date),
      location: Boolean(fd.bath_name?.trim() || fd.bath_address?.trim()),
      cover: Boolean(fd.image_url),
      pricing: Boolean(
        fd.price?.trim() ||
          fd.price_amount ||
          (fd.pricing_tiers && fd.pricing_tiers.length > 0)
      ),
      program: Boolean(
        (fd.program && fd.program.filter(Boolean).length > 0) ||
          (fd.rules && fd.rules.filter(Boolean).length > 0)
      ),
      publish: true,
    };
  }, [formData]);

  const handleSaveAsDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    onFormChange({ ...formData, is_visible: false });
    setTimeout(() => {
      onSubmit(e as unknown as React.FormEvent, false);
    }, 0);
  };

  const handlePublish = (e: React.MouseEvent) => {
    e.preventDefault();
    onFormChange({ ...formData, is_visible: true });
    setTimeout(() => {
      onSubmit(e as unknown as React.FormEvent, false);
    }, 0);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e, false);
  };

  return (
    <div className="pb-24">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        {isEditing ? "Редактировать встречу" : "Новая встреча"}
      </h1>

      <form onSubmit={handleSave}>
        <div className="space-y-3">
          {/* ── Section 1: Basic Info ── */}
          <FormSection
            id="basic"
            icon="FileText"
            title="Основная информация"
            isOpen={openSections.basic}
            onToggle={() => toggleSection("basic")}
            completed={sectionComplete.basic}
          >
            <EventFormBasicFields
              formData={formData}
              onFormChange={onFormChange}
            />
            <div className="mt-4">
              <EventFormTypeSelector
                formData={formData}
                onFormChange={onFormChange}
              />
            </div>
          </FormSection>

          {/* ── Section 2: Date & Time ── */}
          <FormSection
            id="datetime"
            icon="Calendar"
            title="Дата и время"
            isOpen={openSections.datetime}
            onToggle={() => toggleSection("datetime")}
            completed={sectionComplete.datetime}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="event_date">Дата мероприятия *</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) =>
                    onFormChange({ ...formData, event_date: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="start_time">Время начала</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    onFormChange({ ...formData, start_time: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="end_time">Время окончания</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    onFormChange({ ...formData, end_time: e.target.value })
                  }
                />
              </div>
            </div>
          </FormSection>

          {/* ── Section 3: Location ── */}
          <FormSection
            id="location"
            icon="MapPin"
            title="Место проведения"
            isOpen={openSections.location}
            onToggle={() => toggleSection("location")}
            completed={sectionComplete.location}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bath_name">Название бани</Label>
                <Input
                  id="bath_name"
                  placeholder="Например: Высота 30"
                  value={formData.bath_name || ""}
                  onChange={(e) =>
                    onFormChange({ ...formData, bath_name: e.target.value })
                  }
                  maxLength={255}
                />
              </div>
              <div>
                <Label htmlFor="bath_address">Адрес</Label>
                <Input
                  id="bath_address"
                  placeholder="Москва, ул. ..."
                  value={formData.bath_address || ""}
                  onChange={(e) =>
                    onFormChange({ ...formData, bath_address: e.target.value })
                  }
                  maxLength={500}
                />
              </div>
            </div>
          </FormSection>

          {/* ── Section 4: Cover Image ── */}
          <FormSection
            id="cover"
            icon="Image"
            title="Обложка"
            isOpen={openSections.cover}
            onToggle={() => toggleSection("cover")}
            completed={sectionComplete.cover}
          >
            <ImageUpload
              currentImageUrl={formData.image_url}
              onImageUploaded={(url) =>
                onFormChange({ ...formData, image_url: url })
              }
            />
          </FormSection>

          {/* ── Section 5: Pricing & Tickets ── */}
          <FormSection
            id="pricing"
            icon="Ticket"
            title="Стоимость и билеты"
            isOpen={openSections.pricing}
            onToggle={() => toggleSection("pricing")}
            completed={sectionComplete.pricing}
          >
            <EventFormPricingSection
              formData={formData}
              onFormChange={onFormChange}
            />
          </FormSection>

          {/* ── Section 6: Program & Rules ── */}
          <FormSection
            id="program"
            icon="ListChecks"
            title="Программа и правила"
            isOpen={openSections.program}
            onToggle={() => toggleSection("program")}
            completed={sectionComplete.program}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="program">
                  Программа (каждый пункт с новой строки)
                </Label>
                <Textarea
                  id="program"
                  placeholder={
                    "19:00 \u2014 \u0421\u0431\u043E\u0440, \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u043E\n19:30 \u2014 \u041F\u0435\u0440\u0432\u044B\u0439 \u0437\u0430\u0445\u043E\u0434\n20:00 \u2014 \u0427\u0430\u0439\u043D\u0430\u044F \u0446\u0435\u0440\u0435\u043C\u043E\u043D\u0438\u044F"
                  }
                  value={(formData.program || []).join("\n")}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      program: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Опишите расписание мероприятия по пунктам
                </p>
              </div>

              <div>
                <Label htmlFor="rules">
                  Правила (каждое с новой строки)
                </Label>
                <Textarea
                  id="rules"
                  placeholder={
                    "\u0411\u0435\u0437 \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044F\n\u0423\u0432\u0430\u0436\u0430\u0435\u043C \u043B\u0438\u0447\u043D\u043E\u0435 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u043E\n\u041E\u043F\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0434\u043E 15 \u043C\u0438\u043D\u0443\u0442"
                  }
                  value={(formData.rules || []).join("\n")}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      rules: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Укажите важные правила для участников
                </p>
              </div>
            </div>
          </FormSection>

          {/* ── Section 7: Publication (always visible, not collapsible) ── */}
          <FormSection
            id="publish"
            icon="Globe"
            title="Публикация"
            isOpen={true}
            onToggle={() => {}}
            collapsible={false}
            completed={sectionComplete.publish}
          >
            <div className="space-y-5">
              {/* is_visible switch card */}
              <div
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                  formData.is_visible
                    ? "border-green-200 bg-green-50"
                    : "border-border bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      formData.is_visible
                        ? "bg-green-100 text-green-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon
                      name={formData.is_visible ? "Eye" : "EyeOff"}
                      size={18}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {formData.is_visible
                        ? "Мероприятие опубликовано"
                        : "Мероприятие скрыто (черновик)"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formData.is_visible
                        ? "Видно всем посетителям на сайте"
                        : "Только вы видите это мероприятие"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.is_visible}
                  onCheckedChange={(checked) =>
                    onFormChange({ ...formData, is_visible: checked })
                  }
                />
              </div>

              {/* featured checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured || false}
                  onChange={(e) =>
                    onFormChange({ ...formData, featured: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <Label htmlFor="featured" className="cursor-pointer text-sm">
                  <span className="font-medium">Избранное</span>
                  <span className="text-muted-foreground ml-1.5">
                    — выделить мероприятие на главной
                  </span>
                </Label>
              </div>

              {/* occupancy */}
              <div className="max-w-xs">
                <Label htmlFor="occupancy">Загруженность</Label>
                <Select
                  value={formData.occupancy}
                  onValueChange={(value) =>
                    onFormChange({ ...formData, occupancy: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкая</SelectItem>
                    <SelectItem value="medium">Средняя</SelectItem>
                    <SelectItem value="high">Высокая</SelectItem>
                    <SelectItem value="full">Полная</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>
        </div>

        {/* ── Sticky bottom action bar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Отмена
            </Button>

            {isEditing ? (
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Icon
                      name="Loader2"
                      size={16}
                      className="animate-spin mr-2"
                    />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveAsDraft}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Icon
                        name="Loader2"
                        size={16}
                        className="animate-spin mr-2"
                      />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Icon name="FileEdit" size={16} className="mr-2" />
                      Сохранить как черновик
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handlePublish}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Icon
                        name="Loader2"
                        size={16}
                        className="animate-spin mr-2"
                      />
                      Публикация...
                    </>
                  ) : (
                    <>
                      <Icon name="Globe" size={16} className="mr-2" />
                      Опубликовать
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminEventForm;