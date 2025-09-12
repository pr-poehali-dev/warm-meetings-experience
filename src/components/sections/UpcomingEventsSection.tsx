import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";

export default function UpcomingEventsSection() {
  return (
    <section className="py-20 px-6 bg-nature-beige">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-light text-nature-forest mb-6">
            Ближайшие события
          </h2>
          <p className="text-xl text-nature-forest/80 max-w-2xl mx-auto">
            Присоединяйтесь к нашим мероприятиям, где каждая встреча — это возможность для трансформации.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Event 1 */}
          <Card className="bg-nature-cream/95 border-nature-brown/20 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon name="Users" size={20} className="text-nature-brown" />
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                    Знакомства
                  </span>
                </div>
                <div className="text-right text-sm text-nature-forest/60">
                  <div>30 сентября</div>
                  <div>19:00 — 23:00</div>
                </div>
              </div>
              
              <h3 className="text-lg font-serif text-nature-forest mb-2">Тёплые Знакомства: Осенний лес с высоты 30 этажа</h3>
              
              <p className="text-nature-forest/70 text-sm mb-4">Камерная встреча для 12 человек через ритуалы парения и чайные церемонии.</p>
              
              <div className="flex items-center justify-between">
                <div className="text-nature-brown font-medium mx-0">от 5 000 ₽</div>
                <div className="text-xs text-green-600">Осталось 3 места</div>
              </div>
            </CardContent>
          </Card>

          {/* Event 2 */}
          <Card className="bg-nature-cream/95 border-nature-brown/20 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon name="Heart" size={20} className="text-nature-brown" />
                  <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded-full font-medium">
                    Свидания
                  </span>
                </div>
                <div className="text-right text-sm text-nature-forest/60">
                  <div>12 октября</div>
                  <div>20:00 — 23:00</div>
                </div>
              </div>
              
              <h3 className="text-lg font-serif text-nature-forest mb-2">
                Романтический вечер: Пары под паром
              </h3>
              
              <p className="text-nature-forest/70 text-sm mb-4">
                Особый формат для трёх пар. Углубляем близость через совместные практики.
              </p>
              
              <div className="flex items-center justify-between">
                <div className="text-nature-brown font-medium">18 000 ₽ за пару</div>
                <div className="text-xs text-orange-600">Последнее место</div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="text-center">
          <Link to="/events">
            <Button 
              size="lg"
              variant="outline"
              className="border-nature-brown text-nature-brown hover:bg-nature-brown hover:text-nature-cream px-8 py-4 rounded-full transition-all duration-300 hover:scale-105"
            >
              <Icon name="Calendar" size={20} className="mr-2" />
              Все события и расписание
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}