import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

interface SignUpFormProps {
  eventTitle: string;
  spotsLeft: number;
}

export default function SignUpForm({ eventTitle, spotsLeft }: SignUpFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Заполните имя и телефон");
      return;
    }
    setSubmitted(true);
    toast.success("Заявка отправлена! Мы свяжемся с вами в ближайшее время.");
  };

  if (spotsLeft === 0) {
    return (
      <Card className="border-0 shadow-sm bg-muted/50">
        <CardContent className="p-6 text-center">
          <Icon name="UserX" size={32} className="text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">Мест нет</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Все места на это событие заняты. Напишите нам — добавим вас в лист ожидания.
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => window.open("https://t.me/sparcom_ru", "_blank")}
          >
            <Icon name="MessageCircle" size={16} className="mr-2" />
            В лист ожидания
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="border-0 shadow-sm bg-green-50">
        <CardContent className="p-6 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Check" size={28} className="text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Заявка отправлена!</h3>
          <p className="text-muted-foreground text-sm">
            Организатор свяжется с вами для подтверждения записи на «{eventTitle}».
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-1">Записаться</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Оставьте контакты — организатор свяжется с вами
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm">Имя *</Label>
            <Input
              id="name"
              placeholder="Как к вам обращаться"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 rounded-lg"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-sm">Телефон *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+7 (___) ___-__-__"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 rounded-lg"
            />
          </div>
          <div>
            <Label htmlFor="telegram" className="text-sm">Telegram</Label>
            <Input
              id="telegram"
              placeholder="@username"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              className="mt-1.5 rounded-lg"
            />
          </div>
          <Button type="submit" className="w-full rounded-full" size="lg">
            <Icon name="Send" size={16} className="mr-2" />
            Отправить заявку
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
