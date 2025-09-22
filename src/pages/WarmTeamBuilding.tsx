import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

const WarmTeamBuilding = () => {
  const [calculatorData, setCalculatorData] = useState({
    people: "",
    format: "",
    extras: [] as string[]
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    people: "",
    date: "",
    comment: ""
  });

  const formats = [
    {
      title: "Энергия легкого пара",
      description: "Для команд, которым важно снять напряжение и пообщаться в неформальной обстановке",
      price: "от 8 000 ₽/чел"
    },
    {
      title: "Тепло общих побед", 
      description: "Для решения конкретных коммуникационных задач между отделами",
      price: "от 12 000 ₽/чел"
    },
    {
      title: "Баня для ума",
      description: "Для стратегических сессий и мозговых штурмов в расслабляющей атмосфере", 
      price: "от 15 000 ₽/чел"
    }
  ];

  const advantages = [
    {
      icon: "🔥",
      title: "Естественное раскрепощение",
      description: "Тепло и ритуалы снимают психологические защиты быстрее любых тренингов"
    },
    {
      icon: "🤝", 
      title: "Доверие через ритуалы",
      description: "Совместное парение создает опыт взаимной поддержки, который переносится в работу"
    },
    {
      icon: "📊",
      title: "Измеримый результат", 
      description: "Предоставляем отчет для HR с метриками эффективности мероприятия"
    },
    {
      icon: "💡",
      title: "Уникальный формат",
      description: "Единственный в Москве банный тимбилдинг с авторской методикой"
    },
    {
      icon: "🌿",
      title: "Wellness-эффект",
      description: "Снятие стресса и восстановление ресурса сотрудников"
    },
    {
      icon: "⚡",
      title: "Быстрый результат", 
      description: "За 4 часа достигаем того, что классические тренинги дают за месяцы"
    }
  ];

  const steps = [
    {
      title: "Заявка",
      description: "Беседа и диагностика задач команды"
    },
    {
      title: "Подбор", 
      description: "Выбор формата и локации под ваш запрос"
    },
    {
      title: "Подготовка",
      description: "Разработка индивидуального сценария"
    },
    {
      title: "Проведение",
      description: "Организация мероприятия \"под ключ\""
    },
    {
      title: "Результат",
      description: "Обратная связь и рекомендации для HR"
    }
  ];

  const calculatePrice = () => {
    const peopleCount = parseInt(calculatorData.people) || 0;
    const basePrice = calculatorData.format === "Энергия легкого пара" ? 8000 :
                     calculatorData.format === "Тепло общих побед" ? 12000 : 15000;
    return peopleCount * basePrice;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-nature-cream via-white to-nature-cream">
      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.6)), url('/img/f2551001-2b2c-4e6e-8b05-c36d1d5c5fcb.jpg')"
        }}
      >
        <div className="container mx-auto px-4 text-center text-white max-w-4xl drop-shadow-lg">
          <h1 className="text-4xl md:text-6xl font-serif mb-6 leading-tight">
            Тимбилдинг, который работает:<br />
            <span className="text-nature-sand">94% команд улучшают коммуникации</span><br />
            после банных ритуалов
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-200 leading-relaxed">
            Уникальные программы в формате банных ритуалов для сплочения команды<br />
            с измеримым результатом для HR-отдела
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 mb-10 text-left">
            <div className="flex items-center gap-3">
              <Icon name="CheckCircle" className="text-green-400" size={24} />
              <span>Измеримый результат для отчета HR</span>
            </div>
            <div className="flex items-center gap-3">
              <Icon name="CheckCircle" className="text-green-400" size={24} />
              <span>Снятие стресса и восстановление команды</span>
            </div>
            <div className="flex items-center gap-3">
              <Icon name="CheckCircle" className="text-green-400" size={24} />
              <span>Уникальный опыт вместо шаблонного корпоратива</span>
            </div>
          </div>

          <Button 
            size="lg" 
            className="bg-nature-brown hover:bg-nature-forest text-white px-8 py-4 text-lg"
            onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}
          >Рассчитать стоимость</Button>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-gradient-to-r from-[#FFF8DC] to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-serif text-nature-forest mb-12">
              Почему обычные корпоративы не дают результата?
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-none shadow-lg">
                <CardContent className="p-8 text-center">
                  <Icon name="Users" className="text-red-500 mb-4 mx-auto" size={48} />
                  <h3 className="font-semibold text-xl mb-3">Формальность вместо искренности</h3>
                  <p className="text-gray-600">Сотрудники остаются в рабочих ролях</p>
                </CardContent>
              </Card>
              
              <Card className="border-none shadow-lg">
                <CardContent className="p-8 text-center">
                  <Icon name="TrendingDown" className="text-red-500 mb-4 mx-auto" size={48} />
                  <h3 className="font-semibold text-xl mb-3">Нулевой бизнес-эффект</h3>
                  <p className="text-gray-600">Бюджет потрачен, а командная динамика не изменилась</p>
                </CardContent>
              </Card>
              
              <Card className="border-none shadow-lg">
                <CardContent className="p-8 text-center">
                  <Icon name="Copy" className="text-red-500 mb-4 mx-auto" size={48} />
                  <h3 className="font-semibold text-xl mb-3">Шаблонные активности</h3>
                  <p className="text-gray-600">Квесты и мастер-классы уже не впечатляют</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-nature-forest text-white relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-serif mb-8">
              Баня как инструмент бизнес-трансформации
            </h2>
            <p className="text-xl leading-relaxed text-gray-200">
              В банной атмосфере стираются иерархии и исчезают барьеры. 
              Мы создали методику, где каждый банный ритуал становится 
              упражнением на доверие и коммуникацию
            </p>
          </div>
        </div>
      </section>

      {/* 6 Advantages */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {advantages.map((advantage, index) => (
                <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-8 text-center">
                    <div className="text-4xl mb-4">{advantage.icon}</div>
                    <h3 className="font-semibold text-xl mb-3 text-nature-forest">{advantage.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{advantage.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Program Formats */}
      <section className="py-20 bg-gradient-to-b from-nature-cream to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-serif text-center text-nature-forest mb-12">
              Форматы программ
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {formats.map((format, index) => (
                <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <div className="h-48 bg-gradient-to-br from-nature-brown to-nature-forest"></div>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-xl mb-3 text-nature-forest">{format.title}</h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">{format.description}</p>
                    <div className="text-lg font-semibold text-nature-brown">{format.price}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section id="calculator" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-serif text-center text-nature-forest mb-12">
              Рассчитайте стоимость за 30 секунд
            </h2>
            
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Количество человек</label>
                    <input
                      type="number"
                      value={calculatorData.people}
                      onChange={(e) => setCalculatorData({...calculatorData, people: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-brown focus:border-transparent"
                      placeholder="Введите количество участников"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Формат программы</label>
                    <select
                      value={calculatorData.format}
                      onChange={(e) => setCalculatorData({...calculatorData, format: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-brown focus:border-transparent"
                    >
                      <option value="">Выберите формат</option>
                      {formats.map((format, index) => (
                        <option key={index} value={format.title}>{format.title}</option>
                      ))}
                    </select>
                  </div>

                  {calculatorData.people && calculatorData.format && (
                    <div className="bg-nature-cream p-6 rounded-lg text-center">
                      <h3 className="text-2xl font-semibold text-nature-forest mb-2">
                        Предварительная стоимость
                      </h3>
                      <div className="text-3xl font-bold text-nature-brown">
                        {calculatePrice().toLocaleString()} ₽
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Итоговая стоимость может измениться в зависимости от дополнительных опций
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Results & Reviews */}
      <section className="py-20 bg-gradient-to-r from-orange-100 via-orange-50 to-orange-100">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 mb-16 text-center">
              <div>
                <div className="text-4xl font-bold text-nature-brown mb-2">94%</div>
                <p className="text-gray-700">команд улучшили коммуникации</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-nature-brown mb-2">3x</div>
                <p className="text-gray-700">снижение уровня стресса</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-nature-brown mb-2">89%</div>
                <p className="text-gray-700">HR-менеджеров рекомендуют нас</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-none shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-nature-brown rounded-full flex items-center justify-center text-white font-bold">
                      АК
                    </div>
                    <div>
                      <p className="text-gray-700 mb-4 italic">
                        "После вашего тимбилдинга в проектной команде исчезли конфликты. 
                        Это был лучший HR-бюджет за год!"
                      </p>
                      <div className="font-semibold">Анна К.</div>
                      <div className="text-sm text-gray-600">HRD IT-компании</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-nature-brown rounded-full flex items-center justify-center text-white font-bold">
                      ДС
                    </div>
                    <div>
                      <p className="text-gray-700 mb-4 italic">
                        "Никогда не видел свою команду такой сплоченной. 
                        Эффект сохранился на 3 месяца точно!"
                      </p>
                      <div className="font-semibold">Дмитрий С.</div>
                      <div className="text-sm text-gray-600">руководитель отдела разработки</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-serif text-center text-nature-forest mb-12">
              Как мы работаем
            </h2>
            
            <div className="grid md:grid-cols-5 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-nature-brown text-white rounded-full flex items-center justify-center font-bold text-xl mb-4 mx-auto">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-nature-forest">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section className="py-20 bg-gradient-to-b from-nature-cream to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-serif text-center text-nature-forest mb-12">
              Наши гарантии
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Icon name="CheckCircle" className="text-green-500" size={24} />
                <span>Полная безопасность и медицинский контроль</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="CheckCircle" className="text-green-500" size={24} />
                <span>Закрытая баня только для вашей команды</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="CheckCircle" className="text-green-500" size={24} />
                <span>Профессиональные ведущие и пармастеры с опытом</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="CheckCircle" className="text-green-500" size={24} />
                <span>Резервные локации на случай форс-мажора</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Form */}
      <section className="py-20 bg-nature-forest text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-serif mb-4">
              Готовы создать незабываемый тимбилдинг для вашей команды?
            </h2>
            <p className="text-xl mb-8 text-gray-200">
              Оставьте заявку и получите детальный расчет в течение 1 часа
            </p>
            
            <Card className="bg-white text-black">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Ваше имя"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-brown focus:border-transparent"
                  />
                  <input
                    type="tel"
                    placeholder="Телефон"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-brown focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Количество человек"
                    value={formData.people}
                    onChange={(e) => setFormData({...formData, people: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-brown focus:border-transparent"
                  />
                  <input
                    type="date"
                    placeholder="Желаемая дата"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-brown focus:border-transparent"
                  />
                  <textarea
                    placeholder="Комментарий (опционально)"
                    value={formData.comment}
                    onChange={(e) => setFormData({...formData, comment: e.target.value})}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-brown focus:border-transparent"
                  />
                  <Button className="w-full bg-nature-brown hover:bg-nature-forest text-white py-3">
                    Получить расчет
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">Контакты</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon name="Phone" size={16} />
                  <span>+7 (495) 123-45-67</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="Mail" size={16} />
                  <span>hello@teplie-vstrechi.ru</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="MapPin" size={16} />
                  <span>Москва, Подмосковье</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">Социальные сети</h3>
              <div className="flex gap-4">
                <Icon name="Instagram" size={24} className="hover:text-nature-sand cursor-pointer" />
                <Icon name="Facebook" size={24} className="hover:text-nature-sand cursor-pointer" />
                <Icon name="Send" size={24} className="hover:text-nature-sand cursor-pointer" />
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">Тёплые Встречи</h3>
              <p className="text-gray-400">
                Создаём пространства для искренних коммуникаций через банные ритуалы
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WarmTeamBuilding;