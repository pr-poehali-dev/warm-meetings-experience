import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  image_url: string;
  is_visible: boolean;
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
        {formData.id ? "Редактировать мероприятие" : "Добавить мероприятие"}
      </h1>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => onSubmit(e, false)}>
            <div className="space-y-6">
              <div>
                <Label htmlFor="title">Название мероприятия *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => onFormChange({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="short_description">
                  Краткое описание (до 200 символов)
                </Label>
                <Input
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) =>
                    onFormChange({ ...formData, short_description: e.target.value })
                  }
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="full_description">Полное описание</Label>
                <Textarea
                  id="full_description"
                  value={formData.full_description}
                  onChange={(e) =>
                    onFormChange({ ...formData, full_description: e.target.value })
                  }
                  rows={6}
                />
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="occupancy">Загруженность</Label>
                  <Select
                    value={formData.occupancy}
                    onValueChange={(value) => onFormChange({ ...formData, occupancy: value })}
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

                <div>
                  <Label htmlFor="price">Стоимость</Label>
                  <Input
                    id="price"
                    placeholder="Например: 500₽, Бесплатно"
                    value={formData.price}
                    onChange={(e) =>
                      onFormChange({ ...formData, price: e.target.value })
                    }
                  />
                </div>
              </div>

              <ImageUpload
                currentImageUrl={formData.image_url}
                onImageUploaded={(url) => onFormChange({ ...formData, image_url: url })}
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_visible"
                  checked={formData.is_visible}
                  onChange={(e) =>
                    onFormChange({ ...formData, is_visible: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="is_visible" className="cursor-pointer">
                  Опубликовать мероприятие
                </Label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "Сохранение..." : "Сохранить"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => onSubmit(e as any, true)}
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