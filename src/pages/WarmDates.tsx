import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import PriceCalculator from "@/components/PriceCalculator";
import BookingWidget from "@/components/BookingWidget";
import { useNavigate } from "react-router-dom";

const WarmDates = () => {
  const navigate = useNavigate();
  const [selectedRitual, setSelectedRitual] = useState<number | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState<boolean>(false);

  const rituals = [
    {
      icon: 'Wind',
      title: 'Ритуал «Ближе»',
      subtitle: 'Синхронизация дыхания, тепла и взгляда',
      description: 'Помочь парам настроиться на одну волну через телесные практики и осознанное присутствие.',
      format: [
        'Практика совместного дыхания в парной',
        'Синхронные движения и тактильные ритуалы',
        'Упражнения на осознанный зрительный контакт',
        'Ароматерапия с маслами, усиливающими эмпатию'
      ],
      forWhom: 'пары, которые хотят углубить связь, научиться чувствовать друг друга без слов',
      duration: '2 часа',
      effects: [
        'Возвращение к естественному состоянию единства',
        'Слова становятся вторичными',
        'Углубление эмоциональной связи'
      ],
      quote: 'Когда дыхание синхронизируется, границы между «я» и «ты» растворяются.'
    },
    {
      icon: 'Volume2',
      title: 'Тепло в тишине',
      subtitle: 'Свидание без слов, только чувства',
      description: 'Погрузиться в мир тактильных ощущений и эмоционального контакта, где тишина становится языком близости.',
      format: [
        'Медитативное погружение в парной без вербального общения',
        'Практики осознанного прикосновения',
        'Сенсорные игры с теплом, паром и ароматами',
        'Ритуал совместного чаепития в тишине'
      ],
      forWhom: 'пары, уставшие от слов и суеты, желающие услышать друг друга на уровне чувств',
      duration: '2,5 часа',
      effects: [
        'Открытие новых граней отношений через молчаливое присутствие',
        'Углубление тактильной связи',
        'Освобождение от вербальной суеты'
      ],
      quote: 'Иногда лучшее, что можно сказать — это ничего не сказать.'
    },
    {
      icon: 'Flame',
      title: 'Пар на двоих',
      subtitle: 'Обучение искусству парения и совместный ритуал',
      description: 'Научить пары создавать целебный пар и делать массаж вениками друг другу.',
      format: [
        'Мастер-класс по технике парения от опытного банщика',
        'Изучение разных видов веников и их воздействия',
        'Практика синхронного создания пара',
        'Совместный ритуал с применением новых навыков'
      ],
      forWhom: 'активные пары, которые хотят не просто получить услугу, а освоить искусство парения для домашней практики',
      duration: '3 часа',
      effects: [
        'Общее дело, которое объединяет',
        'Практический навык для поддержания близости',
        'Уверенность в технике парения'
      ],
      quote: 'Создавая пар вместе, вы создаёте общую историю заботы.'
    },
    {
      icon: 'Sparkles',
      title: 'Свадебный пар',
      subtitle: 'Для особых дат и воспоминаний',
      description: 'Создать незабываемый ритуал для празднования свадьбы, годовщины или помолвки.',
      format: [
        'Тематическое оформление парной (лепестки цветов, особые ароматы)',
        'Романтический ритуал с использованием свадебной символики',
        'Фирменный чайный сет с праздничными угощениями',
        'Памятный сертификат о прохождении ритуала'
      ],
      forWhom: 'молодожёны и пары, отмечающие важные вехи отношений. Идеальный подарок на свадьбу или годовщину',
      duration: '3 часа',
      effects: [
        'Создание личной традиции',
        'Яркие воспоминания на всю жизнь',
        'Символическое закрепление отношений'
      ],
      quote: 'Праздник не в количестве гостей, а в глубине момента между двумя.'
    },
    {
      icon: 'Utensils',
      title: 'Свидание с ужином',
      subtitle: 'Полное погружение в романтическую атмосферу',
      description: 'Объединить целительную силу пара и наслаждение изысканной кухней.',
      format: [
        'Банный ритуал на выбор («Ближе» или «Тепло в тишине»)',
        'Гастрономическая часть: ужин от шефа в зоне релаксации',
        'Подбор блюд, усиливающих чувственность и энергию пары',
        'Романтическая сервировка и атмосферное освещение'
      ],
      forWhom: 'пары, ценящие полное погружение и желающие сделать свидание по-настоящему особенным',
      duration: '4 часа',
      effects: [
        'Гармония телесного и гастрономического удовольствия',
        'Создание идеальной романтической среды',
        'Многослойное чувственное переживание'
      ],
      quote: 'После пара — тело открыто. После ужина — душа насыщена. Вместе — это полнота.'
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
              variant="outline"
              className="border-2 border-white bg-white/90 text-nature-forest hover:bg-white px-10 py-6 text-lg shadow-2xl font-semibold"
              onClick={() => navigate('/calculator')}
            >
              Записаться на ритуал
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-2 border-white bg-transparent text-white hover:bg-white/10 px-10 py-6 text-lg shadow-2xl font-semibold"
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
                      navigate('/calculator');
                    }}
                  >
                    Записаться на ритуал
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

      <section className="py-16 bg-gradient-to-r from-nature-brown to-nature-forest">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-serif text-white mb-6">
            Готовы к встрече с собой и друг другом?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Выберите формат ритуала, дату и время. Мы создадим для вас пространство настоящей близости.
          </p>
          <Button
            size="lg"
            className="bg-white text-nature-forest hover:bg-nature-cream px-12 py-6 text-lg font-semibold shadow-xl"
            onClick={() => navigate('/calculator')}
          >
            Записаться на ритуал
          </Button>
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



      <PriceCalculator open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </div>
  );
};

export default WarmDates;