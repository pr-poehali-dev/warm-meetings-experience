import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { packages } from "./calculator/data";
import { calculatePrice } from "./calculator/utils";
import Step1PackageSelection from "./calculator/Step1PackageSelection";
import Step2Parameters from "./calculator/Step2Parameters";
import Step3Addons from "./calculator/Step3Addons";
import Step4Booking from "./calculator/Step4Booking";
import PriceSummary from "./calculator/PriceSummary";
import StepIndicator from "./calculator/StepIndicator";

interface PriceCalculatorProps {
  open: boolean;
  onClose: () => void;
}

const PriceCalculator: React.FC<PriceCalculatorProps> = ({ open, onClose }) => {
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedArea, setSelectedArea] = useState<string>("area_moscow_region");
  const [persons, setPersons] = useState<number>(2);
  const [extraDuration, setExtraDuration] = useState<number>(0);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState<string>("");
  const [promoApplied, setPromoApplied] = useState<boolean>(false);

  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [comment, setComment] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedPackage("");
      setSelectedDate(undefined);
      setSelectedArea("area_moscow_region");
      setPersons(2);
      setExtraDuration(0);
      setSelectedAddons([]);
      setPromoCode("");
      setPromoApplied(false);
    }
  }, [open]);

  const { total, breakdown } = calculatePrice(
    selectedPackage,
    selectedDate,
    selectedArea,
    persons,
    extraDuration,
    selectedAddons,
    promoApplied,
    promoCode
  );

  const deposit = Math.round(total * 0.30 / 100) * 100;

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  const handleApplyPromo = () => {
    if (promoCode === "WELCOME10") {
      setPromoApplied(true);
    } else {
      alert("Промо-код не найден");
    }
  };

  const handleBooking = () => {
    if (!name || !phone) {
      alert("Пожалуйста, заполните имя и телефон");
      return;
    }
    
    alert(`Заявка отправлена!\n\nИмя: ${name}\nТелефон: ${phone}\nEmail: ${email}\nПакет: ${packages.find(p => p.id === selectedPackage)?.name}\nИтого: ${total.toLocaleString()} ₽\nДепозит: ${deposit.toLocaleString()} ₽`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-serif text-nature-forest">
            Калькулятор стоимости ритуала
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[2fr,1fr] gap-8 mt-6">
          <div className="space-y-8">
            <StepIndicator currentStep={step} totalSteps={4} />
            {step === 1 && (
              <Step1PackageSelection
                selectedPackage={selectedPackage}
                onSelectPackage={setSelectedPackage}
                onNext={() => setStep(2)}
              />
            )}

            {step === 2 && (
              <Step2Parameters
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                selectedArea={selectedArea}
                onSelectArea={setSelectedArea}
                persons={persons}
                onSelectPersons={setPersons}
                extraDuration={extraDuration}
                onSelectExtraDuration={setExtraDuration}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}

            {step === 3 && (
              <Step3Addons
                selectedAddons={selectedAddons}
                onToggleAddon={handleToggleAddon}
                promoCode={promoCode}
                onPromoCodeChange={setPromoCode}
                promoApplied={promoApplied}
                onApplyPromo={handleApplyPromo}
                onBack={() => setStep(2)}
                onNext={() => setStep(4)}
              />
            )}

            {step === 4 && (
              <Step4Booking
                name={name}
                onNameChange={setName}
                phone={phone}
                onPhoneChange={setPhone}
                email={email}
                onEmailChange={setEmail}
                comment={comment}
                onCommentChange={setComment}
                onBack={() => setStep(3)}
                onSubmit={handleBooking}
              />
            )}
          </div>

          <div className="md:sticky md:top-4 md:self-start">
            <PriceSummary
              selectedPackage={selectedPackage}
              selectedDate={selectedDate}
              selectedArea={selectedArea}
              persons={persons}
              extraDuration={extraDuration}
              promoApplied={promoApplied}
              breakdown={breakdown}
              total={total}
              deposit={deposit}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceCalculator;