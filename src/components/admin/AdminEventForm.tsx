import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PricingTier } from "@/lib/organizer-api";
import Icon from "@/components/ui/icon";
import FormSection from "./FormSection";
import EventFormBasicFields from "./EventFormBasicFields";
import EventFormTypeSelector from "./EventFormTypeSelector";
import EventFormPricingSection from "./EventFormPricingSection";
import EventFormScheduleLocation from "./EventFormScheduleLocation";
import EventFormPublishSection from "./EventFormPublishSection";

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

          <EventFormScheduleLocation
            formData={formData}
            onFormChange={onFormChange}
            openSections={openSections}
            onToggleSection={toggleSection}
            sectionComplete={sectionComplete}
          />

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

          <EventFormPublishSection
            formData={formData}
            onFormChange={onFormChange}
            sectionComplete={sectionComplete}
          />
        </div>

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
