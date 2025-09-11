import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";

export default function OnlineCourses() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-nature-cream to-nature-sage">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Icon name="ArrowLeft" size={20} />
            <span className="text-nature-brown font-medium">На главную</span>
          </Link>
          <h1 className="text-2xl font-bold text-nature-brown">Онлайн-курсы</h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold text-nature-brown mb-6">
              Онлайн
              <span className="block text-nature-sage">курсы</span>
            </h2>
            <p className="text-xl text-nature-brown/80 max-w-3xl mx-auto leading-relaxed">
              Структурированные программы для самостоятельного изучения 
              с практическими заданиями и обратной связью от психолога.
            </p>
          </div>

          {/* Courses */}
          <div className="space-y-12 mb-16">
            {/* Course 1 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Brain" size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-2xl font-bold text-nature-brown">
                      "Основы эмоционального интеллекта"
                    </h3>
                    <span className="bg-nature-sage text-white px-3 py-1 rounded-full text-sm font-medium">
                      Популярный
                    </span>
                  </div>
                  <p className="text-nature-brown/80 mb-6">
                    Изучите свои эмоции, научитесь их понимать и управлять ими. 
                    4-недельный курс с видеолекциями, практическими заданиями и личной обратной связью.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Play" size={16} className="text-nature-sage" />
                      <span>12 видеолекций</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="FileText" size={16} className="text-nature-sage" />
                      <span>20 практических заданий</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Clock" size={16} className="text-nature-sage" />
                      <span>4 недели</span>
                    </div>
                  </div>
                  <div className="bg-nature-sage/10 rounded-2xl p-4 mb-6">
                    <h4 className="font-semibold text-nature-brown mb-2">Программа курса:</h4>
                    <ul className="text-nature-brown/80 space-y-1">
                      <li>• Неделя 1: Что такое эмоции и зачем они нужны</li>
                      <li>• Неделя 2: Распознавание и называние эмоций</li>
                      <li>• Неделя 3: Техники саморегуляции</li>
                      <li>• Неделя 4: Эмоциональное общение с другими</li>
                    </ul>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-nature-brown">7 500 ₽</div>
                    <Button className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream">
                      Подробнее
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Course 2 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Heart" size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-nature-brown mb-4">
                    "Здоровые границы в отношениях"
                  </h3>
                  <p className="text-nature-brown/80 mb-6">
                    Научитесь выстраивать здоровые границы в личных и профессиональных отношениях. 
                    Курс поможет вам сказать "нет" без чувства вины и защитить свое эмоциональное пространство.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Play" size={16} className="text-nature-sage" />
                      <span>8 видеолекций</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="FileText" size={16} className="text-nature-sage" />
                      <span>15 практических заданий</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Clock" size={16} className="text-nature-sage" />
                      <span>3 недели</span>
                    </div>
                  </div>
                  <div className="bg-nature-sage/10 rounded-2xl p-4 mb-6">
                    <h4 className="font-semibold text-nature-brown mb-2">Программа курса:</h4>
                    <ul className="text-nature-brown/80 space-y-1">
                      <li>• Неделя 1: Понятие границ и их важность</li>
                      <li>• Неделя 2: Как говорить "нет" без чувства вины</li>
                      <li>• Неделя 3: Защита от эмоциональных вампиров</li>
                    </ul>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-nature-brown">5 500 ₽</div>
                    <Button className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream">
                      Подробнее
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Course 3 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Zap" size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-2xl font-bold text-nature-brown">
                      "Преодоление тревоги и стресса"
                    </h3>
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                      Скоро
                    </span>
                  </div>
                  <p className="text-nature-brown/80 mb-6">
                    Комплексная программа по работе с тревожными состояниями и стрессом. 
                    Изучите научно обоснованные методы управления тревогой и восстановления внутреннего равновесия.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Play" size={16} className="text-nature-sage" />
                      <span>15 видеолекций</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="FileText" size={16} className="text-nature-sage" />
                      <span>25 практических заданий</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Clock" size={16} className="text-nature-sage" />
                      <span>6 недель</span>
                    </div>
                  </div>
                  <div className="bg-nature-sage/10 rounded-2xl p-4 mb-6">
                    <h4 className="font-semibold text-nature-brown mb-2">Программа курса:</h4>
                    <ul className="text-nature-brown/80 space-y-1">
                      <li>• Неделя 1-2: Природа тревоги и стресса</li>
                      <li>• Неделя 3-4: Техники релаксации и дыхания</li>
                      <li>• Неделя 5-6: Когнитивные методы работы с тревогой</li>
                    </ul>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-nature-brown">9 500 ₽</div>
                    <Button variant="outline" className="border-nature-brown text-nature-brown">
                      Уведомить о запуске
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">
              Что включено в курсы
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Video" size={24} className="text-white" />
                </div>
                <h4 className="font-semibold text-nature-brown mb-2">HD видеолекции</h4>
                <p className="text-nature-brown/80 text-sm">
                  Качественный контент с примерами и практическими советами
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Download" size={24} className="text-white" />
                </div>
                <h4 className="font-semibold text-nature-brown mb-2">Материалы</h4>
                <p className="text-nature-brown/80 text-sm">
                  Рабочие тетради, чек-листы и дополнительные ресурсы
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="MessageCircle" size={24} className="text-white" />
                </div>
                <h4 className="font-semibold text-nature-brown mb-2">Обратная связь</h4>
                <p className="text-nature-brown/80 text-sm">
                  Персональные комментарии к выполненным заданиям
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Award" size={24} className="text-white" />
                </div>
                <h4 className="font-semibold text-nature-brown mb-2">Сертификат</h4>
                <p className="text-nature-brown/80 text-sm">
                  Подтверждение прохождения курса после выполнения всех заданий
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h3 className="text-3xl font-bold text-nature-brown mb-6">
              Начните обучение уже сегодня
            </h3>
            <p className="text-xl text-nature-brown/80 mb-8 max-w-2xl mx-auto">
              Выберите подходящий курс и начните путь к лучшей версии себя. 
              Все курсы доступны сразу после оплаты.
            </p>
            <Button 
              size="lg"
              className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream px-8 py-4 rounded-full transition-all duration-300 hover:scale-105"
              asChild
            >
              <a href="https://t.me/banya_live" target="_blank" rel="noopener noreferrer">
                <Icon name="MessageCircle" size={20} className="mr-2" />
                Записаться на курс
              </a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}