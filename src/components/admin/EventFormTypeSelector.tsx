import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { useEventTypes } from "@/hooks/useEventTypes";

interface Event {
  event_type: string;
  event_type_icon: string;
  [key: string]: unknown;
}

interface Props {
  formData: Event;
  onFormChange: (data: Event) => void;
}

const ICON_OPTIONS = ["Users", "Heart", "GraduationCap", "Coffee", "PartyPopper", "Dumbbell", "Sparkles", "Star", "Flame", "Zap", "Music", "Leaf", "Sun", "Moon", "Wind", "Droplets", "Shield", "Award", "Gift", "Camera"];

export default function EventFormTypeSelector({ formData, onFormChange }: Props) {
  const { types, loading } = useEventTypes();
  const [customTypeName, setCustomTypeName] = useState('');
  const [customTypeIcon, setCustomTypeIcon] = useState('Circle');
  const [showCustomFields, setShowCustomFields] = useState(false);

  const handleTypeChange = (value: string) => {
    if (value === 'custom') {
      setCustomTypeName('');
      setCustomTypeIcon('Circle');
      setShowCustomFields(true);
      return;
    }
    const selected = types.find(t => t.value === value);
    if (selected) {
      onFormChange({ ...formData, event_type: selected.value, event_type_icon: selected.icon });
    }
    setShowCustomFields(false);
  };

  const handleCustomApply = () => {
    if (!customTypeName.trim()) return;
    onFormChange({ ...formData, event_type: customTypeName.trim(), event_type_icon: customTypeIcon });
    setShowCustomFields(false);
  };

  const currentIcon = types.find(t => t.value === formData.event_type)?.icon || formData.event_type_icon || 'Users';

  return (
    <>
      <div>
        <Label htmlFor="event_type">Тип мероприятия</Label>
        <Select
          value={formData.event_type || 'знакомство'}
          onValueChange={handleTypeChange}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue>
              <div className="flex items-center gap-2">
                <Icon name={currentIcon} size={18} />
                <span>{formData.event_type || 'Знакомство'}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {types.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <Icon name={type.icon} size={18} />
                  <span>{type.label}</span>
                </div>
              </SelectItem>
            ))}
            <SelectItem value="custom" className="border-t mt-1">
              <div className="flex items-center gap-2 text-primary">
                <Icon name="Plus" size={18} />
                <span>Указать свой тип...</span>
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
                  placeholder="Например: Женская баня, Нетворкинг"
                  value={customTypeName}
                  onChange={(e) => setCustomTypeName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <Label>Иконка</Label>
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {ICON_OPTIONS.map((icon) => (
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
                <Button type="button" size="sm" onClick={handleCustomApply}>
                  Применить
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowCustomFields(false)}>
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
