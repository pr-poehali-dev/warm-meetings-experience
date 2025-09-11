import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const WarmTeamBuilding = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-nature-sage to-nature-cream">
      {/* Header */}
      <header className="bg-nature-forest/95 text-nature-cream py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="text-xl font-serif flex items-center gap-2 hover:text-nature-sage transition-colors">
            <Icon name="ArrowLeft" size={20} />
            Главная
          </Link>
          <h1 className="text-sm font-medium">Тёплый Тимбилдинг</h1>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-serif text-nature-forest mb-6">
            Команда, которая парится вместе, остаётся вместе
          </h1>
          <p className="text-xl text-nature-forest/80 max-w-3xl mx-auto leading-relaxed">
            Корпоративный формат, где мы снимаем стресс и иерархию через ритуалы парения, 
            чтобы раскрыть человеческий потенциал вашей команды.
          </p>
        </section>

        <div className="max-w-4xl mx-auto space-y-12">
          {/* Для кого */}
          <Card className="bg-nature-cream/95 border-nature-brown/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif text-nature-forest mb-6 flex items-center gap-3">
                <Icon name="Target" size={28} className="text-nature-brown" />
                Для кого
              </h2>
              <div className="space-y-4 text-nature-forest/80">
                <p className="flex items-start gap-3">
                  <Icon name="Crown" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  Для руководителей, которые хотят снять напряжение и повысить уровень доверия в коллективе
                </p>
                <p className="flex items-start gap-3">
                  <Icon name="Users" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  Для HR-менеджеров, ищущих нетривиальные форматы для сплочения команды
                </p>
                <p className="flex items-start gap-3">
                  <Icon name="Zap" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  Для отделов, переживающих изменения или конфликты
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
                Это не стандартный корпоратив. Это immersive-опыт, где мы используем среду русской бани 
                как powerful tool для снятия масок и создания психологической безопасности. 
                В условиях равенства (все в парилке равны) рождается настоящее доверие.
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
                  <Icon name="Bridge" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  <p className="text-nature-forest/80">
                    Снятие коммуникационных барьеров между отделами и уровнями иерархии
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="Heart" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  <p className="text-nature-forest/80">
                    Глубокое доверие и ощущение «мы — команда»
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="Shield" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  <p className="text-nature-forest/80">
                    Снижение уровня стресса и профилактика выгорания сотрудников
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="MessageSquare" size={20} className="text-nature-brown mt-0.5 flex-shrink-0" />
                  <p className="text-nature-forest/80">
                    Новый язык командных метафор («прогреть вопрос», «поддать пару»)
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
                    <h3 className="font-medium text-nature-forest">Погружение</h3>
                  </div>
                  <p className="text-nature-forest/80 ml-11">
                    Знакомство с правилами пространства и safety briefing
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-nature-brown text-nature-cream rounded-full flex items-center justify-center text-sm font-medium">2</div>
                    <h3 className="font-medium text-nature-forest">Синхронизация</h3>
                  </div>
                  <p className="text-nature-forest/80 ml-11">
                    Групповые практики и ритуалы для настройки на общий ритм
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-nature-brown text-nature-cream rounded-full flex items-center justify-center text-sm font-medium">3</div>
                    <h3 className="font-medium text-nature-forest">Парение</h3>
                  </div>
                  <p className="text-nature-forest/80 ml-11">
                    Сеанс глубокого прогревания с элементами командной работы
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-nature-brown text-nature-cream rounded-full flex items-center justify-center text-sm font-medium">4</div>
                    <h3 className="font-medium text-nature-forest">Интеграция</h3>
                  </div>
                  <p className="text-nature-forest/80 ml-11">
                    Сессия обратной связи и рефлексии за чаем
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
                  <span className="text-lg text-nature-forest">Формат «под ключ» (до 12 человек):</span>
                  <span className="text-2xl font-bold text-nature-brown">от 80 000 ₽</span>
                </div>
                <p className="text-nature-forest/70 text-sm">
                  Включено: Работа 2-х ведущих, аренда приватной бани, все материалы, питание
                </p>
                <p className="text-nature-forest/60 text-xs italic">
                  * Стоимость зависит от локации и дополнительных опций
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
                Обсудить запрос для вашей команды
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarmTeamBuilding;