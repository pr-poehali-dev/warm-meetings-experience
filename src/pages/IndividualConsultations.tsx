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
          <h1 className="text-2xl font-bold text-nature-brown">Индивидуальные консультации</h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold text-nature-brown mb-6">
              Персональные
              <span className="block text-nature-sage">консультации</span>
            </h2>
            <p className="text-xl text-nature-brown/80 max-w-3xl mx-auto leading-relaxed">
              Индивидуальная работа с психологом для глубокого понимания себя 
              и решения личных вопросов в комфортной атмосфере.
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-nature-sage rounded-full flex items-center justify-center">
                  <Icon name="User" size={24} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-nature-brown">Личная терапия</h3>
              </div>
              <p className="text-nature-brown/80 mb-6">
                Глубокая работа с личными травмами, страхами и блоками. 
                Помогаю разобраться в себе и найти внутренние ресурсы для изменений.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-nature-brown">
                  <Icon name="Check" size={16} className="text-nature-sage" />
                  Работа с тревогой и депрессией
                </li>
                <li className="flex items-center gap-2 text-nature-brown">
                  <Icon name="Check" size={16} className="text-nature-sage" />
                  Проработка детских травм
                </li>
                <li className="flex items-center gap-2 text-nature-brown">
                  <Icon name="Check" size={16} className="text-nature-sage" />
                  Поиск жизненного пути
                </li>
              </ul>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-nature-sage rounded-full flex items-center justify-center">
                  <Icon name="Heart" size={24} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-nature-brown">Семейная терапия</h3>
              </div>
              <p className="text-nature-brown/80 mb-6">
                Работа с парами и семьями для улучшения отношений, 
                разрешения конфликтов и восстановления доверия.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-nature-brown">
                  <Icon name="Check" size={16} className="text-nature-sage" />
                  Конфликты в паре
                </li>
                <li className="flex items-center gap-2 text-nature-brown">
                  <Icon name="Check" size={16} className="text-nature-sage" />
                  Детско-родительские отношения
                </li>
                <li className="flex items-center gap-2 text-nature-brown">
                  <Icon name="Check" size={16} className="text-nature-sage" />
                  Кризисы в семье
                </li>
              </ul>
            </div>
          </div>

          {/* Format & Pricing */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">Форматы и стоимость</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Clock" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-2">Разовая консультация</h4>
                <p className="text-nature-brown/80 mb-4">50 минут</p>
                <p className="text-2xl font-bold text-nature-sage">3 500 ₽</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Calendar" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-2">Пакет из 4 сессий</h4>
                <p className="text-nature-brown/80 mb-4">4 встречи по 50 минут</p>
                <p className="text-2xl font-bold text-nature-sage">12 000 ₽</p>
                <p className="text-sm text-nature-sage">Экономия 2 000 ₽</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Star" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-2">Долгосрочная терапия</h4>
                <p className="text-nature-brown/80 mb-4">От 8 сессий</p>
                <p className="text-2xl font-bold text-nature-sage">3 000 ₽</p>
                <p className="text-sm text-nature-sage">За сессию</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h3 className="text-3xl font-bold text-nature-brown mb-6">
              Готовы начать путь к изменениям?
            </h3>
            <p className="text-xl text-nature-brown/80 mb-8 max-w-2xl mx-auto">
              Записывайтесь на первую консультацию. 
              Обсудим ваши запросы и найдем подходящий формат работы.
            </p>
            <Button 
              size="lg"
              className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream px-8 py-4 rounded-full transition-all duration-300 hover:scale-105"
              asChild
            >
              <a href="https://t.me/banya_live" target="_blank" rel="noopener noreferrer">
                <Icon name="MessageCircle" size={20} className="mr-2" />
                Записаться на консультацию
              </a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}