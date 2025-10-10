import React from "react";
import { Card } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { PriceBreakdown } from "./types";

interface PriceSummaryProps {
  selectedPackage: string;
  selectedDate: Date | undefined;
  selectedArea: string;
  persons: number;
  extraDuration: number;
  promoApplied: boolean;
  breakdown: PriceBreakdown;
  total: number;
  deposit: number;
}

const PriceSummary: React.FC<PriceSummaryProps> = ({
  selectedPackage,
  selectedDate,
  selectedArea,
  persons,
  extraDuration,
  promoApplied,
  breakdown,
  total,
  deposit,
}) => {
  return (
    <Card className="p-6 bg-nature-cream/30 border-nature-brown/20">
      <h3 className="text-xl font-serif text-nature-forest mb-4">Итоговая стоимость</h3>
      
      <div className="space-y-3 text-sm mb-6">
        {selectedPackage && (
          <>
            <div className="flex justify-between">
              <span className="text-nature-forest/70">Базовая цена:</span>
              <span className="font-medium">{breakdown.basePrice?.toLocaleString()} ₽</span>
            </div>
            
            {breakdown.addonsTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-nature-forest/70">Доп. услуги:</span>
                <span className="font-medium">+{breakdown.addonsTotal?.toLocaleString()} ₽</span>
              </div>
            )}

            {selectedArea === "area_moscow" && (
              <div className="flex justify-between text-nature-brown">
                <span>Москва:</span>
                <span>+30%</span>
              </div>
            )}

            {selectedDate && (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) && (
              <div className="flex justify-between text-nature-brown">
                <span>Выходной день:</span>
                <span>+20%</span>
              </div>
            )}

            {persons > 2 && (
              <div className="flex justify-between text-nature-brown">
                <span>{persons} человека:</span>
                <span>+{persons === 3 ? '15' : '30'}%</span>
              </div>
            )}

            {extraDuration > 0 && (
              <div className="flex justify-between text-nature-brown">
                <span>Удлинение (+{extraDuration} мин):</span>
                <span>+{(extraDuration / 30) * 20}%</span>
              </div>
            )}

            {promoApplied && breakdown.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Промо-код:</span>
                <span>-{breakdown.discount?.toLocaleString()} ₽</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-nature-brown/20 pt-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-serif text-nature-forest">Итого:</span>
          <span className="text-2xl font-bold text-nature-brown">
            {total.toLocaleString()} ₽
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-nature-forest/70">Депозит (30%):</span>
          <span className="font-medium text-nature-brown">
            {deposit.toLocaleString()} ₽
          </span>
        </div>
      </div>

      <div className="space-y-2 text-xs text-nature-forest/60">
        <div className="flex items-start gap-2">
          <Icon name="Info" size={14} className="mt-0.5 flex-shrink-0" />
          <p>Сауна подбирается оператором и включена в стоимость</p>
        </div>
        <div className="flex items-start gap-2">
          <Icon name="MapPin" size={14} className="mt-0.5 flex-shrink-0" />
          <p>Конкретная локация согласовывается после бронирования</p>
        </div>
      </div>
    </Card>
  );
};

export default PriceSummary;
