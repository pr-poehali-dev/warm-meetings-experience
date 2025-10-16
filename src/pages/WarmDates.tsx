import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import PriceCalculator from "@/components/PriceCalculator";

const WarmDates = () => {
  const [selectedRitual, setSelectedRitual] = useState<number | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState<boolean>(false);

  const rituals = [
    {
      icon: 'Wind',
      title: 'Ритуал «Ближе»',
      description: 'Синхронизация дыхания, тепла и взгляда',
      idea: 'Помочь парам настроиться на одну волну через телесные практики и осознанное присутствие.',
      format: [
        'Практика совместного дыхания в парной',
        'Синхронные движения и тактильные ритуалы',
        'Упражнения на осознанный зрительный контакт',
        'Ароматерапия с маслами, усиливающими эмпатию'
      ],
      forWhom: 'Для пар, которые хотят углубить связь, научиться чувствовать друг друга без слов.',
      duration: '2 часа',
      value: 'Возвращение к естественному состоянию единства, где слова становятся вторичными.'
    },
    {
      icon: 'Volume2',
      title: 'Тепло в тишине',
      description: 'Свидание без слов, только чувства',
      idea: 'Погрузиться в мир тактильных ощущений и эмоционального контакта, где тишина становится языком близости.',
      format: [
        'Медитативное погружение в парной без вербального общения',
        'Практики осознанного прикосновения',
        'Сенсорные игры с теплом, паром и ароматами',
        'Ритуал совместного чаепития в тишине'
      ],
      forWhom: 'Для пар, уставших от слов и суеты, желающих услышать друг друга на уровне чувств.',
      duration: '2,5 часа',
      value: 'Открытие новых граней отношений через молчаливое присутствие.'
    },
    {
      icon: 'Flame',
      title: 'Пар на двоих',
      description: 'Обучение искусству парения и совместный ритуал',
      idea: 'Научить пары создавать целебный пар и делать массаж вениками друг другу.',
      format: [
        'Мастер-класс по технике парения от опытного банщика',
        'Изучение разных видов веников и их воздействия',
        'Практика синхронного создания пара',
        'Совместный ритуал с применением новых навыков'
      ],
      forWhom: 'Для активных пар, которые хотят не просто получить услугу, а освоить искусство парения для домашней практики.',
      duration: '3 часа',
      value: 'Общее дело, которое объединяет и даёт практический навык для поддержания близости.'
    },
    {
      icon: 'Sparkles',
      title: 'Свадебный пар',
      description: 'Для особых дат и воспоминаний',
      idea: 'Создать незабываемый ритуал для празднования свадьбы, годовщины или помолвки.',
      format: [
        'Тематическое оформление парной (лепестки цветов, особые ароматы)',
        'Романтический ритуал с использованием свадебной символики',
        'Фирменный чайный сет с праздничными угощениями',
        'Памятный сертификат о прохождении ритуала'
      ],
      forWhom: 'Для молодожёнов и пар, отмечающих важные вехи отношений. Идеальный подарок на свадьбу или годовщину.',
      duration: '3 часа',
      value: 'Создание личной традиции и ярких воспоминаний, которые останутся с парой на всю жизнь.'
    },
    {
      icon: 'Utensils',
      title: 'Свидание с ужином',
      description: 'Полное погружение в романтическую атмосферу',
      idea: 'Объединить целительную силу пара и наслаждение изысканной кухней.',
      format: [
        'Банный ритуал на выбор («Ближе» или «Тепло в тишине»)',
        'Гастрономическая часть: ужин от шефа в зоне релаксации',
        'Подбор блюд, усиливающих чувственность и энергию пары',
        'Романтическая сервировка и атмосферное освещение'
      ],
      forWhom: 'Для пар, ценящих полное погружение и желающих сделать свидание по-настоящему особенным.',
      duration: '4 часа',
      value: 'Гармония телесного и гастрономического удовольствия, создающая идеальную романтическую среду.'
    }
  ];

  const testimonials = [
    {
      text: '«Это была не баня, а сеанс глубокой терапии отношениями. Мы говорили глазами и молчали сердцем. Спасибо.»',
      author: '— Алина и Максим'
    },
    {
      text: '«Подарил жене на годовщину. Она сказала, что это лучший подарок за последние 5 лет. Всё сказано.»',
      author: '— Артём'
    },
    {
      text: '«Свидание, после которого не хочется смотреть в телефон, а хочется смотреть друг на друга.»',
      author: '— Вика и Сергей'
    }
  ];

  const timeline = [
    { title: 'Встреча и чай', description: 'Знакомство, настройка, погружение в атмосферу.' },
    { title: 'Первый заход', description: 'Лёгкий пар. Знакомство с теплом, встреча с собой.' },
    { title: 'Отдых и тишина', description: 'Прохладный напиток, молчаливое созерцание.' },
    { title: 'Второй заход', description: 'Парение на двоих. Синхронизация дыхания и прикосновений.' },
    { title: 'Чайная церемония', description: 'Глубокий разговор или лёгкая беседа у огня.' },
    { title: 'Завершение', description: 'Вы возвращаетесь в мир обновлёнными и соединёнными.' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-nature-cream via-white to-nature-cream">
      <section 
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat pt-24 md:pt-0"
        style={{
          backgroundImage: "linear-gradient(rgba(90,60,50,0.7), rgba(60,40,30,0.8)), url('https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/271711d7-ab48-4ed6-869a-a051e0ec01fc.jpg')"
        }}
      >
        <div className="container mx-auto px-4 text-center text-white max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-serif mb-6 leading-tight">
            Встреча, которая остаётся в коже.<br />
            <span className="text-nature-sand">И в сердце.</span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-gray-200 leading-relaxed max-w-3xl mx-auto">
            Преображаем свидание в глубокий ритуал близости, где тело, чувства и внимание соединяются в атмосфере тепла и заботы.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-nature-brown hover:bg-nature-forest text-white px-10 py-6 text-lg shadow-2xl hover:shadow-nature-sand/50 transition-all"
              onClick={() => setCalculatorOpen(true)}
            >
              Рассчитать стоимость
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-2 border-white bg-white text-nature-forest hover:bg-nature-sand hover:border-nature-sand px-10 py-6 text-lg shadow-2xl font-semibold"
              onClick={() => document.getElementById('rituals')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Узнать подробнее
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div 
              className="h-96 bg-cover bg-center rounded-lg shadow-xl"
              style={{
                backgroundImage: "url('https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/271711d7-ab48-4ed6-869a-a051e0ec01fc.jpg')"
              }}
            />
            <div>
              <h2 className="text-4xl font-serif text-nature-forest mb-6 italic">
                Баня — это не про жар.<br />Это про людей.
              </h2>
              <p className="text-lg text-nature-forest/80 leading-relaxed mb-4">
                Тело — проводник к душе, а тепло — мост между сердцами. Через парение мы создаём мир, в котором люди встречаются по-настоящему: с собой, с другими, с жизнью.
              </p>
              <p className="text-nature-brown font-medium">
                ~ Дмитрий Чикин, основатель
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-nature-cream/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-serif text-center text-nature-forest mb-16">
            Это свидание для вас, если вы...
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-nature-brown/10 rounded-full flex items-center justify-center">
                <Icon name="Users" size={36} className="text-nature-brown" />
              </div>
              <p className="text-nature-forest/80 leading-relaxed">
                Влюблённые пары, желающие углубить связь
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-nature-brown/10 rounded-full flex items-center justify-center">
                <Icon name="Heart" size={36} className="text-nature-brown" />
              </div>
              <p className="text-nature-forest/80 leading-relaxed">
                Супруги, желающие вернуть свежесть и нежность
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-nature-brown/10 rounded-full flex items-center justify-center">
                <Icon name="Sparkles" size={36} className="text-nature-brown" />
              </div>
              <p className="text-nature-forest/80 leading-relaxed">
                Новые пары, стремящиеся узнать друг друга глубже
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-nature-brown/10 rounded-full flex items-center justify-center">
                <Icon name="Gift" size={36} className="text-nature-brown" />
              </div>
              <p className="text-nature-forest/80 leading-relaxed">
                Те, кто празднует или ищет уникальный подарок
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="rituals" className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-4xl md:text-5xl font-serif text-center text-nature-forest mb-12">
            Выберите формат вашей встречи
          </h2>
          <div className="space-y-4">
            {rituals.map((ritual, index) => (
              <Card 
                key={index}
                className="overflow-hidden border-nature-brown/20 hover:border-nature-brown/40 hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => setSelectedRitual(index)}
              >
                <CardContent className="p-8">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 flex-shrink-0 bg-nature-brown/10 rounded-full flex items-center justify-center">
                      <Icon name={ritual.icon} size={32} className="text-nature-brown" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-serif text-nature-forest mb-2 group-hover:text-nature-brown transition-colors">{ritual.title}</h3>
                      <p className="text-nature-forest/70 leading-relaxed">{ritual.description}</p>
                    </div>
                    <div className="flex items-center text-nature-brown font-medium flex-shrink-0">
                      <span>Подробнее</span>
                      <Icon name="ArrowRight" size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={selectedRitual !== null} onOpenChange={() => setSelectedRitual(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedRitual !== null && (
            <>
              <DialogHeader>
                <DialogTitle className="text-3xl font-serif text-nature-forest flex items-center gap-4">
                  <div className="w-14 h-14 bg-nature-brown/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name={rituals[selectedRitual].icon} size={28} className="text-nature-brown" />
                  </div>
                  {rituals[selectedRitual].title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div>
                  <p className="text-lg text-nature-forest/90 italic leading-relaxed">
                    {rituals[selectedRitual].description}
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-nature-brown mb-2">Идея</h4>
                  <p className="text-nature-forest/80 leading-relaxed">
                    {rituals[selectedRitual].idea}
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-nature-brown mb-3">Формат</h4>
                  <ul className="space-y-2">
                    {rituals[selectedRitual].format.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-nature-forest/80">
                        <Icon name="Check" size={20} className="text-nature-brown flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-nature-brown mb-2">Для кого</h4>
                  <p className="text-nature-forest/80 leading-relaxed">
                    {rituals[selectedRitual].forWhom}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-nature-brown">
                    <Icon name="Clock" size={18} />
                    <span className="font-medium">{rituals[selectedRitual].duration}</span>
                  </div>
                </div>

                <div className="bg-nature-cream/50 rounded-lg p-4 border border-nature-brown/20">
                  <h4 className="text-lg font-semibold text-nature-brown mb-2">Ценность</h4>
                  <p className="text-nature-forest/80 leading-relaxed">
                    {rituals[selectedRitual].value}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    className="flex-1 bg-nature-brown hover:bg-nature-forest text-white"
                    onClick={() => {
                      setSelectedRitual(null);
                      setCalculatorOpen(true);
                    }}
                  >
                    Рассчитать стоимость
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-nature-brown text-nature-brown hover:bg-nature-cream"
                    asChild
                  >
                    <a href="https://t.me/DmitryChikin" target="_blank" rel="noopener noreferrer">
                      Забронировать
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <section className="py-20 bg-nature-sage/10">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-serif text-center text-nature-forest mb-16">
            Путешествие длиною в два часа
          </h2>
          <div className="relative">
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-nature-brown/30 hidden md:block" />
            <div className="grid md:grid-cols-3 gap-8">
              {timeline.map((step, index) => (
                <div key={index} className="relative">
                  <div className="bg-white rounded-lg p-6 shadow-lg border border-nature-brown/10">
                    <div className="w-12 h-12 mx-auto mb-4 bg-nature-brown text-white rounded-full flex items-center justify-center text-xl font-serif">
                      {index + 1}
                    </div>
                    <h3 className="text-xl font-serif text-nature-forest mb-2 text-center">{step.title}</h3>
                    <p className="text-nature-forest/70 text-center text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-4xl md:text-5xl font-serif text-center text-nature-forest mb-16">
            Отзывы
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-nature-cream/30 border-nature-brown/20">
                <CardContent className="p-8">
                  <p className="text-lg text-nature-forest/80 italic mb-4 leading-relaxed">
                    {testimonial.text}
                  </p>
                  <p className="text-nature-brown font-medium">{testimonial.author}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section 
        className="relative py-32 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "linear-gradient(rgba(60,40,30,0.85), rgba(40,30,20,0.9)), url('https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/af34bfcb-a0a6-4c11-81e3-dc21f774d1d6.jpg')"
        }}
      >
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-serif text-white mb-6">
            Готовы создать воспоминание?
          </h2>
          <p className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
            Забронируйте ваше путешествие в тепло.
          </p>
          <a 
            href="https://t.me/DmitryChikin" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button 
              size="lg" 
              className="bg-white hover:bg-gray-100 text-gray-900 px-10 py-6 text-lg shadow-2xl font-semibold"
            >
              Выбрать дату и время
            </Button>
          </a>
          <p className="text-gray-300 text-sm mt-6">
            Конфиденциальность и ваше комфортное состояние — наш главный приоритет.
          </p>
        </div>
      </section>

      <PriceCalculator open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </div>
  );
};

export default WarmDates;