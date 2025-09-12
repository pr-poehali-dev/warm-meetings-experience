import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";

export default function MobileServices() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-nature-cream to-nature-sage">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Icon name="ArrowLeft" size={20} />
            <span className="text-nature-brown font-medium">На главную</span>
          </Link>
          <h1 className="text-2xl font-bold text-nature-brown">Выездное парение</h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold text-nature-brown mb-6">Баня вашей мечты у вас дома</h2>
            <p className="text-xl text-nature-brown/80 max-w-3xl mx-auto leading-relaxed">
              Привезём аутентичный банный ритуал на вашу дачу, в особняк или на мероприятие. 
              Полное погружение без хлопот.
            </p>
          </div>

          {/* For Whom Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">Для кого</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Icon name="Home" size={20} className="text-nature-sage mt-1" />
                <p className="text-nature-brown">Для владельцев загородных домов, кто ценит комфорт и аутентичность</p>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="Sparkles" size={20} className="text-nature-sage mt-1" />
                <p className="text-nature-brown">Для тех, кто хочет удивить гостей на свадьбе, дне рождения или корпоративе</p>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="Users" size={20} className="text-nature-sage mt-1" />
                <p className="text-nature-brown">Для семей, желающих провести время с пользой в своём пространстве</p>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="Mountain" size={20} className="text-nature-sage mt-1" />
                <p className="text-nature-brown">Для ретритов и wellness-мероприятий</p>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">Ваша выгода</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="MapPin" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-3">Полный комфорт</h4>
                <p className="text-nature-brown/80">Аутентичный опыт без необходимости куда-то ехать</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Crown" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-3">Эксклюзивность</h4>
                <p className="text-nature-brown/80">Уникальное событие для ваших гостей, которое запомнится</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Package" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-3">«Под ключ»</h4>
                <p className="text-nature-brown/80">Мы привозим всё: от печи-каменки и веников до полотенец и аромамасел</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Settings" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-3">Адаптация</h4>
                <p className="text-nature-brown/80">Создаём ритуал под ваше событие: от нежного семейного формата до энергичного party</p>
              </div>
            </div>
          </div>

          {/* Process Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">Как это происходит</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-nature-sage text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
                <h4 className="text-lg font-semibold text-nature-brown mb-3">Обсуждение</h4>
                <p className="text-nature-brown/80 text-sm">Выясняем детали (локация, число гостей, цели)</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-nature-sage text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
                <h4 className="text-lg font-semibold text-nature-brown mb-3">Подготовка</h4>
                <p className="text-nature-brown/80 text-sm">Мы готовим и привозим всё необходимое оборудование</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-nature-sage text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
                <h4 className="text-lg font-semibold text-nature-brown mb-3">Ритуал</h4>
                <p className="text-nature-brown/80 text-sm">Проводим банную церемонию по заранее согласованному сценарию</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-nature-sage text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
                <h4 className="text-lg font-semibold text-nature-brown mb-3">Завершение</h4>
                <p className="text-nature-brown/80 text-sm">Убираем за собой, оставляя вам только впечатления</p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">Ответы на вопросы</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-nature-brown mb-2">Что нужно от меня?</h4>
                <p className="text-nature-brown/80">Только ровная площадка 3×3 метра и доступ к электричеству и воде.</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-nature-brown mb-2">Какой состав гостей?</h4>
                <p className="text-nature-brown/80">Работаем с любым составом: смешанные компании, мужские/женские группы, семьи с детьми.</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-nature-brown mb-2">Это опасно?</h4>
                <p className="text-nature-brown/80">Используем профессиональное безопасное оборудование. Полная страховка ответственности.</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">Стоимость</h3>
            <div className="text-center">
              <div className="w-20 h-20 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="Truck" size={32} className="text-white" />
              </div>
              <h4 className="text-2xl font-bold text-nature-brown mb-2">Выезд «под ключ» на 4-5 часов</h4>
              <p className="text-4xl font-bold text-nature-sage mb-4">от 30 000 ₽</p>
              <p className="text-nature-brown/80 mb-6">
                Стоимость зависит от локации, числа гостей и задач
              </p>
              <p className="text-nature-brown/80">
                <strong>Включено:</strong> Работа 1-2 пармейстеров, мобильная баня-палатка/печь, все материалы, топливо
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h3 className="text-3xl font-bold text-nature-brown mb-6">
              Обсудить выезд для вашего события
            </h3>
            <p className="text-xl text-nature-brown/80 mb-8 max-w-2xl mx-auto">
              Готовы сделать ваше мероприятие незабываемым? 
              Свяжитесь со мной для обсуждения деталей.
            </p>
            <Button 
              size="lg"
              className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream px-8 py-4 rounded-full transition-all duration-300 hover:scale-105"
              asChild
            >
              <a href="https://t.me/DmitryChikin" target="_blank" rel="noopener noreferrer">
                <Icon name="MessageCircle" size={20} className="mr-2" />
                Обсудить выезд
              </a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}