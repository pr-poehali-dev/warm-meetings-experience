import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";

export default function OrganizerCTASection() {
  return (
    <section className="py-24 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              Проведи свою встречу в кругу своих
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ты организуешь — мы помогаем. Размещай встречи, находи участников и развивай своё дело в сообществе.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            <Card className="p-8 bg-card border-0 shadow-sm text-center">
              <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Users" className="text-accent" size={28} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Готовая аудитория</h3>
              <p className="text-sm text-muted-foreground">Более 500 участников уже ищут новые встречи</p>
            </Card>
            <Card className="p-8 bg-card border-0 shadow-sm text-center">
              <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Settings" className="text-accent" size={28} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Простые инструменты</h3>
              <p className="text-sm text-muted-foreground">Создавай встречи, принимай оплату и управляй записью</p>
            </Card>
            <Card className="p-8 bg-card border-0 shadow-sm text-center">
              <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Handshake" className="text-accent" size={28} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Поддержка на всех этапах</h3>
              <p className="text-sm text-muted-foreground">Поможем с наполнением и продвижением встречи</p>
            </Card>
          </div>

          <div className="text-center">
            <Link to="/organizer">
              <Button size="lg" className="rounded-full text-base px-8">
                Стать организатором
                <Icon name="ArrowRight" size={18} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}