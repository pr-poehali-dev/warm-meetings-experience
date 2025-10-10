import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import Icon from "@/components/ui/icon";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PriceCalculatorProps {
  open: boolean;
  onClose: () => void;
}

interface Package {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  duration: number;
}

interface Addon {
  id: string;
  name: string;
  description: string;
  price: number;
}

const packages: Package[] = [
  {
    id: "intro",
    name: "Intro / Первое свидание",
    description: "Лёгкий ритуал для знакомства с форматом",
    basePrice: 12000,
    duration: 120,
  },
  {
    id: "signature",
    name: 'Signature «Ближе»',
    description: "Основной фирменный ритуал",
    basePrice: 20000,
    duration: 150,
  },
  {
    id: "premium",
    name: "Premium / Глубина доверия",
    description: "Развёрнутый ритуал с VIP-элементами",
    basePrice: 45000,
    duration: 210,
  },
];

const addons: Addon[] = [
  { id: "photo_30", name: "Фотосъёмка 30 мин", description: "20-40 фото", price: 5000 },
  { id: "photo_video", name: "Фото + мини-ролик", description: "60 мин + видео", price: 15000 },
  { id: "massage_30", name: "Синхронный массаж 30 мин", description: "Парный массаж", price: 8000 },
  { id: "massage_60", name: "Синхронный массаж 60 мин", description: "Удлинённая версия", price: 14000 },
  { id: "romantic_set", name: "Романтический сет", description: "Цветы + десерт", price: 3000 },
  { id: "lovebox", name: "LoveBox", description: "Свечи, чай, масло", price: 1800 },
  { id: "transfer", name: "Трансфер", description: "В одну сторону", price: 2500 },
  { id: "private_entry", name: "Приватный вход", description: "Отдельный подъезд", price: 4000 },
];

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

  const calculatePrice = () => {
    const pkg = packages.find(p => p.id === selectedPackage);
    if (!pkg) return { total: 0, breakdown: {} };

    const basePrice = pkg.basePrice;
    
    const addonsTotal = selectedAddons.reduce((sum, addonId) => {
      const addon = addons.find(a => a.id === addonId);
      return sum + (addon?.price || 0);
    }, 0);

    const areaMultiplier = selectedArea === "area_moscow" ? 1.30 : 1.00;
    
    const isWeekend = selectedDate ? (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) : false;
    const dayMultiplier = isWeekend ? 1.20 : 1.00;
    
    const personMultiplier = persons === 2 ? 1.0 : persons === 3 ? 1.15 : 1.30;
    
    const durationMultiplier = 1 + (extraDuration / 30) * 0.20;

    const gross = (basePrice + addonsTotal) * areaMultiplier * dayMultiplier * personMultiplier * durationMultiplier;
    
    let discount = 0;
    if (promoApplied && promoCode === "WELCOME10") {
      discount = Math.min(gross * 0.10, 3000);
    }

    const total = Math.round((gross - discount) / 100) * 100;

    return {
      total,
      breakdown: {
        basePrice,
        addonsTotal,
        areaMultiplier,
        dayMultiplier,
        personMultiplier,
        durationMultiplier,
        gross,
        discount,
      }
    };
  };

  const { total, breakdown } = calculatePrice();
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
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-serif text-nature-forest mb-4">Шаг 1: Выберите пакет</h3>
                <div className="space-y-3">
                  {packages.map((pkg) => (
                    <Card
                      key={pkg.id}
                      className={`p-4 cursor-pointer transition-all border-2 ${
                        selectedPackage === pkg.id
                          ? "border-nature-brown bg-nature-cream/30"
                          : "border-nature-brown/20 hover:border-nature-brown/40"
                      }`}
                      onClick={() => setSelectedPackage(pkg.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-serif text-nature-forest mb-1">{pkg.name}</h4>
                          <p className="text-sm text-nature-forest/70 mb-2">{pkg.description}</p>
                          <p className="text-xs text-nature-brown">Длительность: {pkg.duration} минут</p>
                        </div>
                        <p className="text-xl font-semibold text-nature-brown">
                          {pkg.basePrice.toLocaleString()} ₽
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedPackage}
                  className="w-full bg-nature-brown hover:bg-nature-forest"
                >
                  Далее
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-serif text-nature-forest mb-4">Шаг 2: Параметры</h3>
                
                <div>
                  <Label className="text-nature-forest mb-2 block">Дата</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border border-nature-brown/20"
                    disabled={(date) => date < new Date()}
                  />
                </div>

                <div>
                  <Label className="text-nature-forest mb-3 block">Зона обслуживания</Label>
                  <RadioGroup value={selectedArea} onValueChange={setSelectedArea}>
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
                  <RadioGroup value={persons.toString()} onValueChange={(v) => setPersons(parseInt(v))}>
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
                  <RadioGroup value={extraDuration.toString()} onValueChange={(v) => setExtraDuration(parseInt(v))}>
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
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1"
                  >
                    Назад
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    className="flex-1 bg-nature-brown hover:bg-nature-forest"
                  >
                    Далее
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
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
                      onClick={() => handleToggleAddon(addon.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedAddons.includes(addon.id)}
                          onCheckedChange={() => handleToggleAddon(addon.id)}
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
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Введите промо-код"
                      disabled={promoApplied}
                    />
                    <Button
                      onClick={handleApplyPromo}
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
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="flex-1"
                  >
                    Назад
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    className="flex-1 bg-nature-brown hover:bg-nature-forest"
                  >
                    К бронированию
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h3 className="text-xl font-serif text-nature-forest mb-4">Шаг 4: Контактные данные</h3>
                
                <div>
                  <Label className="text-nature-forest mb-2 block">Имя *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ваше имя"
                  />
                </div>

                <div>
                  <Label className="text-nature-forest mb-2 block">Телефон *</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    type="tel"
                  />
                </div>

                <div>
                  <Label className="text-nature-forest mb-2 block">Email</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    type="email"
                  />
                </div>

                <div>
                  <Label className="text-nature-forest mb-2 block">Комментарий</Label>
                  <Input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ваши пожелания"
                  />
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox id="consent" />
                  <Label htmlFor="consent" className="text-sm text-nature-forest/80 cursor-pointer">
                    Я согласен на обработку персональных данных
                  </Label>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep(3)}
                    variant="outline"
                    className="flex-1"
                  >
                    Назад
                  </Button>
                  <Button
                    onClick={handleBooking}
                    className="flex-1 bg-nature-brown hover:bg-nature-forest"
                  >
                    Забронировать
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="md:sticky md:top-4 md:self-start">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceCalculator;
