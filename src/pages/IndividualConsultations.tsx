import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";

export default function IndividualConsultations() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-nature-cream to-nature-sage">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Icon name="ArrowLeft" size={20} />
            <span className="text-nature-brown font-medium">На главную</span>
          </Link>
          <h1 className="text-2xl font-bold text-nature-brown">Индивидуальное парение</h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold text-nature-brown mb-6">Персональное парение: встреча с собой</h2>
            <p className="text-xl text-nature-brown/80 max-w-3xl mx-auto leading-relaxed">
              Глубокое погружение, где всё внимание — только вам. Ритуал для снятия напряжения, 
              перезагрузки сознания и диалога с телом.
            </p>
          </div>

          {/* For Whom Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">Для кого</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Icon name="Crown" size={20} className="text-nature-sage mt-1" />
                <p className="text-nature-brown">Для тех, кто ценит эксклюзивность и персональный подход</p>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="Zap" size={20} className="text-nature-sage mt-1" />
                <p className="text-nature-brown">Для уставших от стресса и нуждающихся в глубоком перезапуске</p>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="Heart" size={20} className="text-nature-sage mt-1" />
                <p className="text-nature-brown">Для тех, кто хочет разобраться в запросах своего тела без суеты</p>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="Shield" size={20} className="text-nature-sage mt-1" />
                <p className="text-nature-brown">Для новичков, кто хочет впервые познакомиться с баней в безопасном формате</p>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">Ваша выгода</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Target" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-3">100% внимание</h4>
                <p className="text-nature-brown/80">Программа, созданная под ваши уникальные запросы (расслабление, восстановление после спорта, детокс)</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Waves" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-3">Глубина погружения</h4>
                <p className="text-nature-brown/80">Возможность достичь состояния глубокого транса и осознанности, недоступного в группе</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Lock" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-3">Безопасность и доверие</h4>
                <p className="text-nature-brown/80">Полная конфиденциальность и возможность быть собой</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Award" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-3">Экспертный подход</h4>
                <p className="text-nature-brown/80">Не просто пар, а работа с телом и дыханием для точечного результата</p>
              </div>
            </div>
          </div>

          {/* Process Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">Как это происходит</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-nature-sage text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
                <h4 className="text-lg font-semibold text-nature-brown mb-3">Диалог</h4>
                <p className="text-nature-brown/80 text-sm">Предварительная беседа для определения вашего состояния и запроса</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-nature-sage text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
                <h4 className="text-lg font-semibold text-nature-brown mb-3">Настройка</h4>
                <p className="text-nature-brown/80 text-sm">Создание атмосферы (свет, звук, ароматы) под ваши задачи</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-nature-sage text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
                <h4 className="text-lg font-semibold text-nature-brown mb-3">Парение</h4>
                <p className="text-nature-brown/80 text-sm">Авторский ритуал с акцентами на нужные зоны и состояния</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-nature-sage text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
                <h4 className="text-lg font-semibold text-nature-brown mb-3">Интеграция</h4>
                <p className="text-nature-brown/80 text-sm">Время для осознания эффекта и чайный ритуал для закрепления</p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">Ответы на вопросы</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-nature-brown mb-2">А если я никогда не парился?</h4>
                <p className="text-nature-brown/80">Идеально для новичков. Это самый безопасный формат.</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-nature-brown mb-2">Что взять с собой?</h4>
                <p className="text-nature-brown/80">Нужно только ваше тело и желание relax. Всё остальное предоставим мы.</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-nature-brown mb-2">Какой будет эффект?</h4>
                <p className="text-nature-brown/80">Вы выйдете обновлённым, ясным и наполненным, как после недели отпуска.</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">Стоимость</h3>
            <div className="text-center">
              <div className="w-20 h-20 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="Clock" size={32} className="text-white" />
              </div>
              <h4 className="text-2xl font-bold text-nature-brown mb-2">Персональная 2-часовая сессия</h4>
              <p className="text-4xl font-bold text-nature-sage mb-4">10 000 ₽</p>
              <p className="text-nature-brown/80 mb-6">
                Включено: Работа пармейстера, приватная локация, травяной чай и все материалы
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h3 className="text-3xl font-bold text-nature-brown mb-6">
              Забронировать свой ритуал
            </h3>
            <p className="text-xl text-nature-brown/80 mb-8 max-w-2xl mx-auto">
              Готовы к персональному путешествию в мир банной культуры? 
              Свяжитесь со мной для бронирования сессии.
            </p>
            <Button 
              size="lg"
              className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream px-8 py-4 rounded-full transition-all duration-300 hover:scale-105"
              asChild
            >
              <a href="https://t.me/DmitryChikin" target="_blank" rel="noopener noreferrer">
                <Icon name="MessageCircle" size={20} className="mr-2" />
                Забронировать ритуал
              </a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}