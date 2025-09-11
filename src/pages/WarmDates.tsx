import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const WarmDates = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-nature-sage to-nature-cream">
      {/* Header */}
      <header className="bg-nature-forest/95 text-nature-cream py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="text-xl font-serif flex items-center gap-2 hover:text-nature-sage transition-colors">
            <Icon name="ArrowLeft" size={20} />
            Главная
          </Link>
          <h1 className="text-sm font-medium">Тёплые Свидания</h1>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-serif text-nature-forest mb-6">
            Свидание, которое вернёт вас друг к другу
          </h1>
          <p className="text-xl text-nature-forest/80 max-w-3xl mx-auto leading-relaxed">
            Интимный формат для пар, где через тактильность, ритуалы и общее погружение 
            рождается новая глубина близости.
          </p>
        </section>

        <div className="max-w-4xl mx-auto space-y-12">
          {/* Для кого */}
          <Card className="bg-nature-cream/95 border-nature-brown/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif text-nature-forest mb-6 flex items-center gap-3">
                <Icon name="HeartHandshake" size={28} className="text-nature-brown" />
                Для кого
              </h2>
              <div className="space-y-4 text-nature-forest/80">
                <p className="flex items-start gap-3">
                  <Icon name="RefreshCw" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  Для пар, которые хотят освежить ощущения и выйти из режима рутины
                </p>
                <p className="flex items-start gap-3">
                  <Icon name="Calendar" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  Для тех, кто отмечает особую дату (годовщина, предложение)
                </p>
                <p className="flex items-start gap-3">
                  <Icon name="Heart" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  Для пар, желающих углубить эмоциональную и телесную связь
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
              <p className="text-nature-forest/80 text-lg leading-relaxed">
                Это больше, чем спа. Это персональный ритуал для вас двоих, где я, как проводник, 
                создаю безопасное и чувственное пространство. Через синхронное парение, контрастные практики 
                и ритуалы заботы вы заново учитесь чувствовать друг друга без слов.
              </p>
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
                  <Icon name="Hand" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  <p className="text-nature-forest/80">
                    Возвращение тактильности и невербального диалога в отношения
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="Waves" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  <p className="text-nature-forest/80">
                    Глубокое расслабление и снятие накопленного напряжения вместе
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="Camera" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  <p className="text-nature-forest/80">
                    Новые shared воспоминания, которые станут ресурсом для пары
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="Sparkles" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  <p className="text-nature-forest/80">
                    Романтический опыт, который невозможно повторить в обычной обстановке
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
                    <h3 className="font-medium text-nature-forest">Настройка</h3>
                  </div>
                  <p className="text-nature-forest/80 ml-11">
                    Персональное обсуждение ваших пожеланий и границ
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-nature-brown text-nature-cream rounded-full flex items-center justify-center text-sm font-medium">2</div>
                    <h3 className="font-medium text-nature-forest">Ритуал</h3>
                  </div>
                  <p className="text-nature-forest/80 ml-11">
                    Совместное парение по авторской методике для пар
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-nature-brown text-nature-cream rounded-full flex items-center justify-center text-sm font-medium">3</div>
                    <h3 className="font-medium text-nature-forest">Практика</h3>
                  </div>
                  <p className="text-nature-forest/80 ml-11">
                    Контрастные immersion (лёд/пар) для пробуждения чувственности
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-nature-brown text-nature-cream rounded-full flex items-center justify-center text-sm font-medium">4</div>
                    <h3 className="font-medium text-nature-forest">Завершение</h3>
                  </div>
                  <p className="text-nature-forest/80 ml-11">
                    Чаепитие и время для интеграции ощущений вдвоём
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
                  <span className="text-lg text-nature-forest">Индивидуальная сессия для пары (2-3 часа):</span>
                  <span className="text-2xl font-bold text-nature-brown">15 000 ₽</span>
                </div>
                <p className="text-nature-forest/70 text-sm">
                  Включено: Приватная локация, работа пармейстера, авторский чайный сет, все материалы
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
              <Button className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream px-8 py-3 text-lg">
                <Icon name="MessageCircle" size={20} className="mr-2" />
                Забронировать для нас двоих
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarmDates;