import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { addons } from "./data";

interface Step3AddonsProps {
  selectedAddons: string[];
  onToggleAddon: (addonId: string) => void;
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
  promoApplied: boolean;
  onApplyPromo: () => void;
  onBack: () => void;
  onNext: () => void;
}

const Step3Addons: React.FC<Step3AddonsProps> = ({
  selectedAddons,
  onToggleAddon,
  promoCode,
  onPromoCodeChange,
  promoApplied,
  onApplyPromo,
  onBack,
  onNext,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-serif text-nature-forest mb-4">Шаг 3: Дополнительные услуги</h3>
      
      <div className="grid gap-3">
        {addons.map((addon) => (
          <Card
            key={addon.id}
            className={`p-4 cursor-pointer transition-all border ${
              selectedAddons.includes(addon.id)
                ? "border-nature-brown bg-nature-cream/30"
                : "border-nature-brown/20 hover:border-nature-brown/40"
            }`}
            onClick={() => onToggleAddon(addon.id)}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selectedAddons.includes(addon.id)}
                onCheckedChange={() => onToggleAddon(addon.id)}
              />
              <div className="flex-1">
                <h4 className="font-medium text-nature-forest mb-1">{addon.name}</h4>
                <p className="text-sm text-nature-forest/70">{addon.description}</p>
              </div>
              <p className="font-semibold text-nature-brown whitespace-nowrap">
                +{addon.price.toLocaleString()} ₽
              </p>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <Label className="text-nature-forest mb-2 block">Промо-код</Label>
        <div className="flex gap-2">
          <Input
            value={promoCode}
            onChange={(e) => onPromoCodeChange(e.target.value)}
            placeholder="Введите промо-код"
            disabled={promoApplied}
          />
          <Button
            onClick={onApplyPromo}
            disabled={promoApplied || !promoCode}
            variant="outline"
          >
            {promoApplied ? "Применён" : "Применить"}
          </Button>
        </div>
        {promoApplied && (
          <p className="text-sm text-green-600 mt-2">✓ Промо-код применён</p>
        )}
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
        >
          К бронированию
        </Button>
      </div>
    </div>
  );
};

export default Step3Addons;
