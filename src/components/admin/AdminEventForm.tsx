import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PricingTier } from "@/lib/organizer-api";
import EventFormBasicFields from "./EventFormBasicFields";
import EventFormTypeSelector from "./EventFormTypeSelector";
import EventFormPricingSection from "./EventFormPricingSection";

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
  pricing_type?: 'fixed' | 'dynamic';
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
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        {formData.id ? "Редактировать встречу" : "Добавить встречу"}
      </h1>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => onSubmit(e, false)}>
            <div className="space-y-6">
              <EventFormBasicFields formData={formData} onFormChange={onFormChange} />

              <EventFormTypeSelector formData={formData} onFormChange={onFormChange} />

              <EventFormPricingSection formData={formData} onFormChange={onFormChange} />

              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "Сохранение..." : "Сохранить"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => onSubmit(e as React.FormEvent, true)}
                  disabled={loading}
                >
                  Сохранить и добавить новое
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEventForm;
