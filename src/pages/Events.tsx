import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

const Events = () => {
  const upcomingEvents = [
    {
      id: 1,
      title: "Тёплые Знакомства: Осенний лес с вясоты 30 этажа",
      date: "30 сентября 2025",
      time: "19:00 — 23:00",
      type: "Знакомства",
      location: "Баня на Чистых Прудах",
      price: "5 000 ₽",
      description:
        "Камерная встреча для 8 человек. Через ритуалы парения и чайные церемонии создаём пространство искренности.",
      spotsLeft: 3,
      totalSpots: 8,
      icon: "Users",
    },
    {
      id: 2,
      title: "Корпоративный retreat: Reset для команды",
      date: "30 сентября 2025",
      time: "10:00 — 18:00",
      type: "Тимбилдинг",
      location: "Загородная усадьба «Теремок»",
      price: "от 12 000 ₽/чел",
      description:
        "Полный день трансформации для команды до 15 человек. Снимаем напряжение и строим доверие.",
      spotsLeft: 15,
      totalSpots: 15,
      icon: "HandHeart",
    },
    {
      id: 3,
      title: "Мастер-класс: Искусство банных ритуалов",
      date: "5 октября 2025",
      time: "15:00 — 18:00",
      type: "Обучение",
      location: "Студия «Традиции»",
      price: "3 500 ₽",
      description:
        "Изучаем древние практики работы с паром, дыханием и энергией пространства.",
      spotsLeft: 2,
      totalSpots: 12,
      icon: "Flame",
    },
    {
      id: 4,
      title: "Романтический вечер: Пары под паром",
      date: "12 октября 2025",
      time: "20:00 — 23:00",
      type: "Свидания",
      location: "Приватная баня «Уют»",
      price: "18 000 ₽ за пару",
      description:
        "Особый формат для трёх пар. Углубляем близость через совместные практики.",
      spotsLeft: 1,
      totalSpots: 3,
      icon: "Heart",
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Знакомства":
        return "bg-blue-100 text-blue-800";
      case "Тимбилдинг":
        return "bg-green-100 text-green-800";
      case "Обучение":
        return "bg-purple-100 text-purple-800";
      case "Свидания":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-nature-sage to-nature-cream">
      {/* Header */}
      <header className="bg-nature-forest/95 text-nature-cream py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-serif flex items-center gap-2 hover:text-nature-sage transition-colors"
          >
            <Icon name="ArrowLeft" size={20} />
            Главная
          </Link>
          <h1 className="text-sm font-medium">Ближайшие события</h1>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-serif text-nature-forest mb-6">
            Ближайшие события
          </h1>
          <p className="text-xl text-nature-forest/80 max-w-3xl mx-auto leading-relaxed">
            Присоединяйтесь к нашим мероприятиям, где каждая встреча — это
            возможность для глубокой трансформации и искренних связей.
          </p>
        </section>

        {/* Events Grid */}
        <div className="max-w-6xl mx-auto space-y-8">
          {upcomingEvents.map((event) => (
            <Card
              key={event.id}
              className="bg-nature-cream/95 border-nature-brown/20 overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <CardContent className="p-0">
                <div className="grid lg:grid-cols-3 gap-0">
                  {/* Event Info */}
                  <div className="lg:col-span-2 p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Icon
                          name={event.icon as any}
                          size={24}
                          className="text-nature-brown"
                        />
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(event.type)}`}
                        >
                          {event.type}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-nature-forest/60">
                          {event.date}
                        </div>
                        <div className="text-sm font-medium text-nature-forest">
                          {event.time}
                        </div>
                      </div>
                    </div>

                    <h2 className="text-2xl font-serif text-nature-forest mb-3">
                      {event.title}
                    </h2>

                    <p className="text-nature-forest/80 mb-4 leading-relaxed">
                      {event.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-nature-forest/70 mb-6">
                      <div className="flex items-center gap-2">
                        <Icon
                          name="MapPin"
                          size={16}
                          className="text-nature-brown"
                        />
                        {event.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon
                          name="Users"
                          size={16}
                          className="text-nature-brown"
                        />
                        Осталось мест: {event.spotsLeft} из {event.totalSpots}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-nature-forest/60 mb-1">
                        <span>Заполненность</span>
                        <span>
                          {Math.round(
                            ((event.totalSpots - event.spotsLeft) /
                              event.totalSpots) *
                              100,
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-nature-sage/20 rounded-full h-2">
                        <div
                          className="bg-nature-brown h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${((event.totalSpots - event.spotsLeft) / event.totalSpots) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Booking Section */}
                  <div className="bg-nature-sage/10 p-8 flex flex-col justify-center">
                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold text-nature-brown mb-2">
                        {event.price}
                      </div>
                      {event.spotsLeft > 0 ? (
                        <div className="text-sm text-green-600 font-medium">
                          ✓ Места доступны
                        </div>
                      ) : (
                        <div className="text-sm text-red-600 font-medium">
                          ✗ Мест нет
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <a
                        href="https://t.me/DmitryChikin"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          className="w-full bg-nature-brown hover:bg-nature-brown/90 text-nature-cream"
                          disabled={event.spotsLeft === 0}
                        >
                          <Icon
                            name="MessageCircle"
                            size={16}
                            className="mr-2"
                          />
                          {event.spotsLeft > 0 ? "Записаться" : "Лист ожидания"}
                        </Button>
                      </a>

                      <Button
                        variant="outline"
                        className="w-full border-nature-brown text-nature-brown hover:bg-nature-brown hover:text-nature-cream"
                      >
                        <Icon name="Info" size={16} className="mr-2" />
                        Подробнее
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Newsletter Signup */}
        <Card className="max-w-2xl mx-auto mt-16 bg-nature-brown/5 border-nature-brown/30">
          <CardContent className="p-8 text-center">
            <Icon
              name="Bell"
              size={32}
              className="text-nature-brown mx-auto mb-4"
            />
            <h3 className="text-xl font-serif text-nature-forest mb-4">
              Не пропустите новые события
            </h3>
            <p className="text-nature-forest/80 mb-6">
              Подпишитесь на уведомления о новых мероприятиях и получите скидку
              10% на первое участие.
            </p>
            <a
              href="https://t.me/banya_live"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream">
                <Icon name="MessageCircle" size={16} className="mr-2" />
                Подписаться в Telegram
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Events;
