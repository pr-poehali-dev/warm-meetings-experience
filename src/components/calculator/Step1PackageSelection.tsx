import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Step1PackageSelectionProps {
  selectedPackage: string;
  onSelectPackage: (packageId: string) => void;
  onNext: () => void;
  packages: any[];
  loading: boolean;
}

const Step1PackageSelection: React.FC<Step1PackageSelectionProps> = ({
  selectedPackage,
  onSelectPackage,
  onNext,
  packages,
  loading,
}) => {
  if (loading) {
    return <div className="text-center py-8 text-nature-forest">Загрузка пакетов...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-serif text-nature-forest mb-4">Шаг 1: Выберите пакет</h3>
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
      <Button
        onClick={onNext}
        disabled={!selectedPackage}
        className="w-full bg-nature-brown hover:bg-nature-forest"
      >
        Далее
      </Button>
    </div>
  );
};

export default Step1PackageSelection;