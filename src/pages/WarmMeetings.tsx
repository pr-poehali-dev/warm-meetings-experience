import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const WarmMeetings = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-nature-sage to-nature-cream">
      {/* Header */}
      <header className="bg-nature-forest/95 text-nature-cream py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="text-xl font-serif flex items-center gap-2 hover:text-nature-sage transition-colors">
            <Icon name="ArrowLeft" size={20} />
            Главная
          </Link>
          <h1 className="text-sm font-medium">Тёплые Знакомства</h1>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-serif text-nature-forest mb-6">
            Знакомства, где не нужно притворяться
          </h1>
          <p className="text-xl text-nature-forest/80 max-w-3xl mx-auto leading-relaxed">
            Уютное пространство, где вы можете быть собой и найти искренние связи 
            через ритуалы парения и живой диалог.
          </p>
        </section>

        <div className="max-w-4xl mx-auto space-y-12">
          {/* Для кого */}
          <Card className="bg-nature-cream/95 border-nature-brown/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif text-nature-forest mb-6 flex items-center gap-3">
                <Icon name="Users" size={28} className="text-nature-brown" />
                Для кого
              </h2>
              <div className="space-y-4 text-nature-forest/80">
                <p className="flex items-start gap-3">
                  <Icon name="Heart" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  Для тех, кто устал от суеты свиданий и поверхностного общения в приложениях
                </p>
                <p className="flex items-start gap-3">
                  <Icon name="Search" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  Для ищущих глубокие и осмысленные отношения
                </p>
                <p className="flex items-start gap-3">
                  <Icon name="Sparkles" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  Для тех, кто ценит атмосферу и искренность
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Суть формата */}
          <Card className="bg-nature-sage/10 border-nature-brown/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif text-nature-forest mb-6 flex items-center gap-3">
                <Icon name="Compass" size={28} className="text-nature-brown" />
                Суть формата
              </h2>
              <p className="text-nature-forest/80 text-lg leading-relaxed">Это не не быстрые свидания и не вечеринка. Это тщательно подготовленная встреча для 8-12 человек в атмосфере доверия и взаимного уважения. Через общие ритуалы парения, чаепития и легкие диалоги мы создаём условия, где маски остаются за дверью.</p>
            </CardContent>
          </Card>

          {/* Что получите */}
          <Card className="bg-nature-cream/95 border-nature-brown/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif text-nature-forest mb-6 flex items-center gap-3">
                <Icon name="Gift" size={28} className="text-nature-brown" />
                Что получите
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Icon name="Eye" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  <p className="text-nature-forest/80">
                    Опыт быть увиденным и услышанным по-настоящему
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="Heart" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  <p className="text-nature-forest/80">
                    Глубокие знакомства на основе общих ценностей
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="Shield" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  <p className="text-nature-forest/80">
                    Снятие напряжения и страха перед первым контактом
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="Zap" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  <p className="text-nature-forest/80">
                    Возможность почувствовать энергию другого человека
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Как это происходит */}
          <Card className="bg-nature-sage/10 border-nature-brown/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif text-nature-forest mb-6 flex items-center gap-3">
                <Icon name="MapPin" size={28} className="text-nature-brown" />
                Как это происходит
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-nature-brown text-nature-cream rounded-full flex items-center justify-center text-sm font-medium">1</div>
                    <h3 className="font-medium text-nature-forest">Знакомство</h3>
                  </div>
                  <p className="text-nature-forest/80 ml-11">
                    Лёгкий брифинг и чайный ритуал для снятия зажимов
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-nature-brown text-nature-cream rounded-full flex items-center justify-center text-sm font-medium">2</div>
                    <h3 className="font-medium text-nature-forest">Парение</h3>
                  </div>
                  <p className="text-nature-forest/80 ml-11">
                    Совместное посещение парной с элементами невербальной коммуникации
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-nature-brown text-nature-cream rounded-full flex items-center justify-center text-sm font-medium">3</div>
                    <h3 className="font-medium text-nature-forest">Диалог</h3>
                  </div>
                  <p className="text-nature-forest/80 ml-11">Легкая беседа в кругу на глубокие, но неформальные темы</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-nature-brown text-nature-cream rounded-full flex items-center justify-center text-sm font-medium">4</div>
                    <h3 className="font-medium text-nature-forest">Интеграция</h3>
                  </div>
                  <p className="text-nature-forest/80 ml-11">
                    Неспешное завершение и обмен контактами по желанию
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Стоимость */}
          <Card className="bg-nature-brown/5 border-nature-brown/30">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif text-nature-forest mb-6 flex items-center gap-3">
                <Icon name="CreditCard" size={28} className="text-nature-brown" />
                Стоимость
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg text-nature-forest">Участие:</span>
                  <span className="text-2xl font-bold text-nature-brown">от 5 000 ₽</span>
                </div>
                <p className="text-nature-forest/70 text-sm">
                  Включено: Работа ведущего, аренда локации, чайная церемония, все материалы
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center">
            <a 
              href="https://t.me/DmitryChikin" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream px-8 py-3 text-lg">Посмотреть ближайшие мероприятия</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarmMeetings;