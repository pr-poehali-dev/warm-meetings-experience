import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Icon from "@/components/ui/icon";
import FUNC_URLS from '../../../backend/func2url.json';

interface Step2ParametersProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  selectedArea: string;
  onSelectArea: (area: string) => void;
  persons: number;
  onSelectPersons: (persons: number) => void;
  extraDuration: number;
  onSelectExtraDuration: (duration: number) => void;
  onBack: () => void;
  onNext: () => void;
}

const Step2Parameters: React.FC<Step2ParametersProps> = ({
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  selectedArea,
  onSelectArea,
  persons,
  onSelectPersons,
  extraDuration,
  onSelectExtraDuration,
  onBack,
  onNext,
}) => {
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return;
    }

    const fetchAvailableSlots = async () => {
      setLoadingSlots(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const response = await fetch(`${FUNC_URLS['calendar-availability']}?date=${dateStr}`);
        const data = await response.json();
        setAvailableSlots(data.available_slots || []);
      } catch (error) {
        console.error('Error loading slots:', error);
        setAvailableSlots([]);
      }
      setLoadingSlots(false);
    };

    fetchAvailableSlots();
  }, [selectedDate]);

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-serif text-nature-forest mb-4">Шаг 2: Параметры</h3>
      
      <div>
        <Label className="text-nature-forest mb-2 block">Дата</Label>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            onSelectDate(date);
            onSelectTime('');
          }}
          className="rounded-md border border-nature-brown/20"
          disabled={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + 30);
            return date < today || date > maxDate;
          }}
        />
      </div>

      {selectedDate && (
        <div>
          <Label className="text-nature-forest mb-3 block">Время начала</Label>
          {loadingSlots ? (
            <div className="flex items-center justify-center py-8 text-nature-forest/60">
              <Icon name="Loader2" className="animate-spin mr-2" size={20} />
              Загрузка доступных слотов...
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8 text-nature-forest/60">
              <Icon name="Calendar" className="mx-auto mb-2" size={32} />
              <p>На выбранную дату нет доступных слотов</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => onSelectTime(slot)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedTime === slot
                      ? 'border-nature-brown bg-nature-brown text-white'
                      : 'border-nature-brown/20 hover:border-nature-brown/50'
                  }`}
                >
                  {formatTime(slot)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <Label className="text-nature-forest mb-3 block">Зона обслуживания</Label>
        <RadioGroup value={selectedArea} onValueChange={onSelectArea}>
          <div className="flex items-center space-x-2 mb-2">
            <RadioGroupItem value="area_moscow_region" id="region" />
            <Label htmlFor="region" className="cursor-pointer">Московская область (базовая цена)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="area_moscow" id="moscow" />
            <Label htmlFor="moscow" className="cursor-pointer">Москва (+30%)</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="text-nature-forest mb-3 block">Количество участников</Label>
        <RadioGroup value={persons.toString()} onValueChange={(v) => onSelectPersons(parseInt(v))}>
          <div className="flex items-center space-x-2 mb-2">
            <RadioGroupItem value="2" id="p2" />
            <Label htmlFor="p2" className="cursor-pointer">2 человека</Label>
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <RadioGroupItem value="3" id="p3" />
            <Label htmlFor="p3" className="cursor-pointer">3 человека (+15%)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="4" id="p4" />
            <Label htmlFor="p4" className="cursor-pointer">4 человека (+30%)</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="text-nature-forest mb-3 block">Удлинение длительности</Label>
        <RadioGroup value={extraDuration.toString()} onValueChange={(v) => onSelectExtraDuration(parseInt(v))}>
          <div className="flex items-center space-x-2 mb-2">
            <RadioGroupItem value="0" id="d0" />
            <Label htmlFor="d0" className="cursor-pointer">Без удлинения</Label>
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <RadioGroupItem value="30" id="d30" />
            <Label htmlFor="d30" className="cursor-pointer">+30 минут (+20%)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="60" id="d60" />
            <Label htmlFor="d60" className="cursor-pointer">+60 минут (+40%)</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1"
        >
          Назад
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 bg-nature-brown hover:bg-nature-forest"
          disabled={!selectedDate || !selectedTime}
        >
          Далее
        </Button>
      </div>
    </div>
  );
};

export default Step2Parameters;