import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Step4BookingProps {
  name: string;
  onNameChange: (name: string) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  email: string;
  onEmailChange: (email: string) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

const Step4Booking: React.FC<Step4BookingProps> = ({
  name,
  onNameChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  comment,
  onCommentChange,
  onBack,
  onSubmit,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-serif text-nature-forest mb-4">Шаг 4: Контактные данные</h3>
      
      <div>
        <Label className="text-nature-forest mb-2 block">Имя *</Label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ваше имя"
        />
      </div>

      <div>
        <Label className="text-nature-forest mb-2 block">Телефон *</Label>
        <Input
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="+7 (___) ___-__-__"
          type="tel"
        />
      </div>

      <div>
        <Label className="text-nature-forest mb-2 block">Email</Label>
        <Input
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="your@email.com"
          type="email"
        />
      </div>

      <div>
        <Label className="text-nature-forest mb-2 block">Комментарий</Label>
        <Input
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Ваши пожелания"
        />
      </div>

      <div className="flex items-start gap-2">
        <Checkbox id="consent" />
        <Label htmlFor="consent" className="text-sm text-nature-forest/80 cursor-pointer leading-relaxed">
          Я согласен на обработку персональных данных в соответствии с{" "}
          <Link 
            to="/personal-data-consent" 
            target="_blank"
            className="text-nature-brown hover:underline"
          >
            Согласием
          </Link>
          {" "}и{" "}
          <Link 
            to="/privacy-policy" 
            target="_blank"
            className="text-nature-brown hover:underline"
          >
            Политикой конфиденциальности
          </Link>
        </Label>
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
          onClick={onSubmit}
          className="flex-1 bg-nature-brown hover:bg-nature-forest"
        >
          Забронировать
        </Button>
      </div>
    </div>
  );
};

export default Step4Booking;