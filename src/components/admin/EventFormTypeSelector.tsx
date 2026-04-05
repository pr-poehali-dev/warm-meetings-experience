import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";

interface Event {
  event_type: string;
  event_type_icon: string;
  [key: string]: unknown;
}

interface Props {
  formData: Event;
  onFormChange: (data: Event) => void;
}

const BASE_EVENT_TYPES = [
  { value: 'знакомство', label: 'Знакомство', icon: 'Users' },
  { value: 'свидание', label: 'Свидание', icon: 'Heart' },
  { value: 'обучение', label: 'Обучение', icon: 'GraduationCap' },
  { value: 'встреча', label: 'Встреча', icon: 'Coffee' },
  { value: 'вечеринка', label: 'Вечеринка', icon: 'PartyPopper' },
  { value: 'спорт', label: 'Спорт', icon: 'Dumbbell' },
  { value: 'другое', label: 'Другое', icon: 'Circle' },
];

const STORAGE_KEY = 'org_custom_event_types';

function loadCustomTypes(): { value: string; label: string; icon: string }[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCustomTypes(types: { value: string; label: string; icon: string }[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
}

export default function EventFormTypeSelector({ formData, onFormChange }: Props) {
  const [customTypeName, setCustomTypeName] = useState('');
  const [customTypeIcon, setCustomTypeIcon] = useState('Circle');
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [customTypes, setCustomTypes] = useState<{ value: string; label: string; icon: string }[]>(loadCustomTypes);

  const eventTypes = [...BASE_EVENT_TYPES, ...customTypes];

  const handleTypeChange = (value: string) => {
    if (value === 'custom') {
      setCustomTypeName('');
      setCustomTypeIcon('Circle');
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
    if (!customTypeName.trim()) return;
    const newType = { value: customTypeName.trim(), label: customTypeName.trim(), icon: customTypeIcon || 'Circle' };
    const exists = eventTypes.find(t => t.value === newType.value);
    if (!exists) {
      const updated = [...customTypes, newType];
      setCustomTypes(updated);
      saveCustomTypes(updated);
    }
    onFormChange({
      ...formData,
      event_type: newType.value,
      event_type_icon: newType.icon
    });
    setShowCustomFields(false);
  };

  const handleDeleteCustomType = (value: string) => {
    const updated = customTypes.filter(t => t.value !== value);
    setCustomTypes(updated);
    saveCustomTypes(updated);
    if (formData.event_type === value) {
      onFormChange({ ...formData, event_type: 'другое', event_type_icon: 'Circle' });
    }
  };

  return (
    <>
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
            {BASE_EVENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <Icon name={type.icon} size={18} />
                  <span>{type.label}</span>
                </div>
              </SelectItem>
            ))}
            {customTypes.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium border-t mt-1 pt-2">Мои типы</div>
                {customTypes.map((type) => (
                  <div key={type.value} className="flex items-center pr-1">
                    <SelectItem value={type.value} className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon name={type.icon} size={18} />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteCustomType(type.value); }}
                      className="ml-1 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0"
                      title="Удалить тип"
                    >
                      <Icon name="X" size={13} />
                    </button>
                  </div>
                ))}
              </>
            )}
            <SelectItem value="custom" className="border-t mt-1">
              <div className="flex items-center gap-2 text-primary">
                <Icon name="Plus" size={18} />
                <span>Добавить свой тип...</span>
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
                  maxLength={100}
                />
              </div>
              <div>
                <Label>Иконка</Label>
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {["Users", "Heart", "GraduationCap", "Coffee", "PartyPopper", "Dumbbell", "Sparkles", "Star", "Flame", "Zap", "Music", "Leaf", "Sun", "Moon", "Wind", "Droplets", "Shield", "Award", "Gift", "Camera"].map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      title={icon}
                      onClick={() => setCustomTypeIcon(icon)}
                      className={`flex items-center justify-center w-10 h-10 rounded border-2 transition-colors ${customTypeIcon === icon ? "border-blue-500 bg-blue-100" : "border-gray-200 hover:border-gray-400"}`}
                    >
                      <Icon name={icon} size={20} fallback="Circle" />
                    </button>
                  ))}
                </div>
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
    </>
  );
}
