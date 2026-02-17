import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
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

const eventTypes = [
  { value: 'знакомство', label: 'Знакомство', icon: 'Users' },
  { value: 'свидание', label: 'Свидание', icon: 'Heart' },
  { value: 'обучение', label: 'Обучение', icon: 'GraduationCap' },
  { value: 'встреча', label: 'Встреча', icon: 'Coffee' },
  { value: 'вечеринка', label: 'Вечеринка', icon: 'PartyPopper' },
  { value: 'спорт', label: 'Спорт', icon: 'Dumbbell' },
  { value: 'другое', label: 'Другое', icon: 'Circle' },
];

const AdminEventForm = ({
  formData,
  loading,
  onFormChange,
  onSubmit,
  onCancel,
}: AdminEventFormProps) => {
  const [customTypeName, setCustomTypeName] = useState('');
  const [customTypeIcon, setCustomTypeIcon] = useState('');
  const [showCustomFields, setShowCustomFields] = useState(false);

  const handleTypeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomFields(true);
      return;
    }
    const selectedType = eventTypes.find(t => t.value === value);
    if (selectedType) {
      onFormChange({ 
        ...formData, 
        event_type: selectedType.value,
        event_type_icon: selectedType.icon
      });
    }
    setShowCustomFields(false);
  };

  const handleCustomTypeApply = () => {
    if (customTypeName.trim()) {
      onFormChange({ 
        ...formData, 
        event_type: customTypeName,
        event_type_icon: customTypeIcon || 'Circle'
      });
      setShowCustomFields(false);
    }
  };

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

              <div>
                <Label htmlFor="event_type">Тип мероприятия</Label>
                <Select
                  value={formData.event_type || 'знакомство'}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <Icon name={formData.event_type_icon || 'Users'} size={18} />
                        <span>{formData.event_type || 'Знакомство'}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon name={type.icon} size={18} />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Icon name="Plus" size={18} />
                        <span>Свой тип...</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showCustomFields && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="custom_type_name">Название типа *</Label>
                        <Input
                          id="custom_type_name"
                          placeholder="Например: Мастер-класс"
                          value={customTypeName}
                          onChange={(e) => setCustomTypeName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom_type_icon">Иконка (lucide-react)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="custom_type_icon"
                            placeholder="Например: Sparkles, Star, Flame"
                            value={customTypeIcon}
                            onChange={(e) => setCustomTypeIcon(e.target.value)}
                          />
                          {customTypeIcon && (
                            <div className="flex items-center justify-center w-10 h-10 border rounded">
                              <Icon name={customTypeIcon} size={20} fallback="Circle" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Доступные иконки: Users, Heart, GraduationCap, Coffee, PartyPopper, Dumbbell, Sparkles, Star, Flame и др.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={handleCustomTypeApply}>
                          Применить
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setShowCustomFields(false)}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bath_name">Название бани</Label>
                  <Input
                    id="bath_name"
                    placeholder="Например: Высота 30"
                    value={formData.bath_name || ''}
                    onChange={(e) => onFormChange({ ...formData, bath_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="bath_address">Адрес</Label>
                  <Input
                    id="bath_address"
                    placeholder="Москва, ул. ..."
                    value={formData.bath_address || ''}
                    onChange={(e) => onFormChange({ ...formData, bath_address: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price_amount">Цена (число)</Label>
                  <Input
                    id="price_amount"
                    type="number"
                    value={formData.price_amount || 0}
                    onChange={(e) => onFormChange({ ...formData, price_amount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="price_label">Цена (текст)</Label>
                  <Input
                    id="price_label"
                    placeholder="от 5 000 ₽"
                    value={formData.price_label || ''}
                    onChange={(e) => onFormChange({ ...formData, price_label: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="total_spots">Кол-во мест</Label>
                  <Input
                    id="total_spots"
                    type="number"
                    value={formData.total_spots || 0}
                    onChange={(e) => {
                      const total = parseInt(e.target.value) || 0;
                      onFormChange({ ...formData, total_spots: total, spots_left: Math.min(formData.spots_left || total, total) });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spots_left">Свободных мест</Label>
                  <Input
                    id="spots_left"
                    type="number"
                    value={formData.spots_left || 0}
                    onChange={(e) => onFormChange({ ...formData, spots_left: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-end gap-4 pb-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={formData.featured || false}
                      onChange={(e) => onFormChange({ ...formData, featured: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="featured" className="cursor-pointer">Избранное</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="program">Программа (каждый пункт с новой строки)</Label>
                <Textarea
                  id="program"
                  placeholder={"19:00 — Сбор, знакомство\n19:30 — Первый заход\n20:00 — Чайная церемония"}
                  value={(formData.program || []).join('\n')}
                  onChange={(e) => onFormChange({ ...formData, program: e.target.value.split('\n').filter(Boolean) })}
                  rows={5}
                />
              </div>

              <div>
                <Label htmlFor="rules">Правила (каждое с новой строки)</Label>
                <Textarea
                  id="rules"
                  placeholder={"Без алкоголя\nУважаем границы\nПриходим вовремя"}
                  value={(formData.rules || []).join('\n')}
                  onChange={(e) => onFormChange({ ...formData, rules: e.target.value.split('\n').filter(Boolean) })}
                  rows={4}
                />
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