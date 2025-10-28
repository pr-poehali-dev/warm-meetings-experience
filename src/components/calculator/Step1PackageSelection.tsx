import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";

const CALENDAR_AVAILABILITY_URL = 'https://functions.poehali.dev/4f685755-a5d0-49f6-8351-5d452cf7ceb2';

interface Step1PackageSelectionProps {
  selectedPackage: string;
  onSelectPackage: (packageId: string) => void;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  onNext: () => void;
  packages: any[];
  loading: boolean;
}

const Step1PackageSelection: React.FC<Step1PackageSelectionProps> = ({
  selectedPackage,
  onSelectPackage,
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  onNext,
  packages,
  loading,
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
        const response = await fetch(`${CALENDAR_AVAILABILITY_URL}?date=${dateStr}`);
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

  if (loading) {
    return <div className="text-center py-8 text-nature-forest">Загрузка пакетов...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-serif text-nature-forest mb-4">Шаг 1: Выберите пакет, дату и время</h3>
        <div className="space-y-3">
        {packages.map((pkg) => (
          <Card
            key={pkg.id}
            className={`p-4 cursor-pointer transition-all border-2 ${
              selectedPackage === String(pkg.id)
                ? "border-nature-brown bg-nature-cream/30"
                : "border-nature-brown/20 hover:border-nature-brown/40"
            }`}
            onClick={() => onSelectPackage(String(pkg.id))}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-serif text-nature-forest mb-1">{pkg.name}</h4>
                <p className="text-sm text-nature-forest/70 mb-2">{pkg.description}</p>
                <p className="text-xs text-nature-brown">Длительность: {pkg.duration_hours} часа</p>
              </div>
              <p className="text-xl font-semibold text-nature-brown">
                {parseFloat(pkg.base_price).toLocaleString()} ₽
              </p>
            </div>
          </Card>
        ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label className="text-nature-forest mb-2 block font-medium">Выберите дату</Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              onSelectDate(date);
              onSelectTime('');
            }}
            className="rounded-md border border-nature-brown/20 w-full"
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const maxDate = new Date();
              maxDate.setDate(maxDate.getDate() + 30);
              return date < today || date > maxDate;
            }}
          />
        </div>

        <div>
          <Label className="text-nature-forest mb-2 block font-medium">Выберите время</Label>
          {!selectedDate ? (
            <div className="text-center py-12 text-nature-forest/60 border border-nature-brown/20 rounded-md">
              <Icon name="Calendar" className="mx-auto mb-2" size={32} />
              <p>Сначала выберите дату</p>
            </div>
          ) : loadingSlots ? (
            <div className="flex items-center justify-center py-12 text-nature-forest/60 border border-nature-brown/20 rounded-md">
              <Icon name="Loader2" className="animate-spin mr-2" size={20} />
              Загрузка доступных слотов...
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-12 text-nature-forest/60 border border-nature-brown/20 rounded-md">
              <Icon name="Calendar" className="mx-auto mb-2" size={32} />
              <p>На выбранную дату нет доступных слотов</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto border border-nature-brown/20 rounded-md p-4">
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
      </div>

      <Button
        onClick={onNext}
        disabled={!selectedPackage || !selectedDate || !selectedTime}
        className="w-full bg-nature-brown hover:bg-nature-forest"
      >
        Далее к параметрам
      </Button>
    </div>
  );
};

export default Step1PackageSelection;