import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";

export default function StatesSection() {
  return (
    <section className="py-20 px-6 bg-nature-forest">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-serif font-light text-nature-cream text-center mb-16">
          В каком состоянии вы хотите встретиться?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-nature-cream/95 border-nature-brown/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-8 flex flex-col h-full">
              <div className="flex items-center mb-4">
                <Icon name="Users" size={32} className="text-nature-brown mr-3" />
                <span className="text-sm text-nature-brown font-medium uppercase tracking-wide">
                  Состояние
                </span>
              </div>
              <h3 className="text-2xl font-serif font-medium text-nature-forest mb-3">
                Искренность
              </h3>
              <p className="text-nature-forest/60 text-sm mb-4 italic">
                Тёплые Знакомства
              </p>
              <p className="text-nature-forest/80 mb-4">
                Для тех, кто устал от масок и хочет услышать и быть услышанным.
              </p>
              <p className="text-sm text-nature-brown italic mb-3">
                «Знакомство, которое начинается с сердца, а не с профиля в соцсети.»
              </p>
              <p className="text-xs text-nature-forest/50 mb-4 flex-grow">
                Локация: уютная камерная баня в черте города
              </p>
              <Button 
                size="sm"
                className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream rounded-full self-start"
                asChild
              >
                <Link to="/warm-meetings">
                  Подробнее
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-nature-cream/95 border-nature-brown/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-8 flex flex-col h-full">
              <div className="flex items-center mb-4">
                <Icon name="HandHeart" size={32} className="text-nature-brown mr-3" />
                <span className="text-sm text-nature-brown font-medium uppercase tracking-wide">
                  Состояние
                </span>
              </div>
              <h3 className="text-2xl font-serif font-medium text-nature-forest mb-3">
                Доверие
              </h3>
              <p className="text-nature-forest/60 text-sm mb-4 italic">
                Тёплый Тимбилдинг
              </p>
              <p className="text-nature-forest/80 mb-4">
                Для команд, которые хотят стать не коллегами, а сплочённым кругом.
              </p>
              <p className="text-sm text-nature-brown italic mb-3">
                «Где руководитель и стажёр встречаются как равные у общего пара.»
              </p>
              <p className="text-xs text-nature-forest/50 mb-4 flex-grow">
                Локация: подбирается индивидуально под запрос и бюджет компании
              </p>
              <Button 
                size="sm"
                className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream rounded-full self-start"
                asChild
              >
                <Link to="/warm-team-building">
                  Подробнее
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-nature-cream/95 border-nature-brown/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-8 flex flex-col h-full">
              <div className="flex items-center mb-4">
                <Icon name="Heart" size={32} className="text-nature-brown mr-3" />
                <span className="text-sm text-nature-brown font-medium uppercase tracking-wide">
                  Состояние
                </span>
              </div>
              <h3 className="text-2xl font-serif font-medium text-nature-forest mb-3">
                Близость
              </h3>
              <p className="text-nature-forest/60 text-sm mb-4 italic">
                Тёплые Свидания
              </p>
              <p className="text-nature-forest/80 mb-4">
                Для пар, которые хотят говорить на языке прикосновений и тишины.
              </p>
              <p className="text-sm text-nature-brown italic mb-3">
                «Свидание, которое вернёт вас от гаджетов — друг к другу.»
              </p>
              <p className="text-xs text-nature-forest/50 mb-4 flex-grow">
                Локация: приватная баня с особенным настроением
              </p>
              <Button 
                size="sm"
                className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream rounded-full self-start"
                asChild
              >
                <Link to="/warm-dates">
                  Подробнее
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}