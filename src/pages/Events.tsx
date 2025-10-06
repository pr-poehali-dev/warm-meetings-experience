import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

interface Event {
  id: number;
  title: string;
  short_description: string;
  full_description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  occupancy: string;
  price: string;
  event_type: string;
  event_type_icon: string;
  image_url: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

const API_URL = "https://functions.poehali.dev/0d9ea640-f2f5-4e63-8633-db26b10decc8";

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?visible=true`);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const getOccupancyLabel = (occupancy: string) => {
    const labels: Record<string, string> = {
      low: "Много мест",
      medium: "Есть места",
      high: "Мало мест",
      full: "Мест нет",
    };
    return labels[occupancy] || "Есть места";
  };

  const getOccupancyColor = (occupancy: string) => {
    const colors: Record<string, string> = {
      low: "text-green-600",
      medium: "text-blue-600",
      high: "text-orange-600",
      full: "text-red-600",
    };
    return colors[occupancy] || "text-gray-600";
  };

  const getOccupancyWidth = (occupancy: string) => {
    const widths: Record<string, number> = {
      low: 25,
      medium: 50,
      high: 75,
      full: 100,
    };
    return widths[occupancy] || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-nature-sage to-nature-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-nature-brown border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-nature-forest">Загрузка мероприятий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nature-sage to-nature-cream">
      {/* Header */}
      <header className="bg-nature-forest/95 text-nature-cream py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-serif flex items-center gap-2 hover:text-nature-sage transition-colors"
          >Назад</Link>
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
        {events.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="Calendar" size={64} className="text-nature-brown mx-auto mb-4 opacity-50" />
            <p className="text-xl text-nature-forest/60">Пока нет запланированных мероприятий</p>
            <p className="text-nature-forest/50 mt-2">Следите за обновлениями в нашем Telegram</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8">
            {events.map((event) => (
              <Card
                key={event.id}
                className="bg-nature-cream/95 border-nature-brown/20 overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <CardContent className="p-0">
                  <div className="grid lg:grid-cols-3 gap-0">
                    {event.image_url && (
                      <div className="lg:col-span-1 relative h-64 lg:h-auto">
                        <img 
                          src={event.image_url} 
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className={event.image_url ? "lg:col-span-2 p-8" : "lg:col-span-3 p-8"}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-nature-brown bg-nature-sage/30 px-3 py-1.5 rounded-full">
                            <Icon
                              name={event.event_type_icon || 'Users'}
                              size={18}
                              className="text-nature-brown"
                            />
                            <span className="text-sm font-medium">{event.event_type}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-nature-forest/60">
                            {formatDate(event.event_date)}
                          </div>
                          {event.start_time && event.end_time && (
                            <div className="text-sm font-medium text-nature-forest">
                              {formatTime(event.start_time)} — {formatTime(event.end_time)}
                            </div>
                          )}
                        </div>
                      </div>

                      <h2 className="text-2xl font-serif text-nature-forest mb-3">
                        {event.title}
                      </h2>

                      {event.short_description && (
                        <p className="text-nature-forest/80 mb-4 leading-relaxed">
                          {event.short_description}
                        </p>
                      )}

                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-nature-forest/60 mb-1">
                          <span>Заполненность</span>
                          <span className={`font-medium ${getOccupancyColor(event.occupancy)}`}>
                            {getOccupancyLabel(event.occupancy)}
                          </span>
                        </div>
                        <div className="w-full bg-nature-sage/20 rounded-full h-2">
                          <div
                            className="bg-nature-brown h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${getOccupancyWidth(event.occupancy)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-nature-brown/10">
                        {event.price && (
                          <div className="text-2xl font-bold text-nature-brown">
                            {event.price}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <a
                            href="https://t.me/DmitryChikin"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream"
                              disabled={event.occupancy === 'full'}
                            >
                              <Icon
                                name="MessageCircle"
                                size={16}
                                className="mr-2"
                              />
                              {event.occupancy === 'full' ? "Лист ожидания" : "Записаться"}
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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