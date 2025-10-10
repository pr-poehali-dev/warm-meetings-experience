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
  const [consentChecked, setConsentChecked] = useState<boolean>(false);

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
      setConsentChecked(false);
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

  const handleBooking = async () => {
    if (!name || !phone || !consentChecked) {
      alert("Пожалуйста, заполните все обязательные поля и подтвердите согласие");
      return;
    }

    const selectedPackageData = packages.find(p => p.id === selectedPackage);
    
    try {
      const response = await fetch('https://functions.poehali.dev/0c83af59-23b2-45d2-b91c-4948f162ee87?resource=bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: name,
          client_phone: phone,
          client_email: email || null,
          package_id: selectedPackage || null,
          package_name: selectedPackageData?.name || '',
          service_area_id: selectedArea || null,
          event_date: selectedDate ? selectedDate.toISOString().split('T')[0] : null,
          person_count: persons,
          selected_addons: selectedAddons,
          promo_code: promoApplied ? promoCode : null,
          base_price: breakdown.basePrice || total,
          total_price: total,
          discount_amount: breakdown.discount || 0,
          calculation_details: breakdown,
          consent_given: consentChecked
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка при отправке заявки');
      }

      const result = await response.json();
      alert(`Заявка успешно отправлена!\n\nНомер заявки: ${result.id}\nИтого: ${total.toLocaleString()} ₽\nДепозит: ${deposit.toLocaleString()} ₽\n\nМы свяжемся с вами в ближайшее время!`);
      onClose();
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('Произошла ошибка при отправке заявки. Пожалуйста, попробуйте снова или свяжитесь с нами напрямую.');
    }
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
                consentChecked={consentChecked}
                onConsentChange={setConsentChecked}
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