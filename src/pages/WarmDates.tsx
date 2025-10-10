import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

const WarmDates = () => {
  const [activeRitual, setActiveRitual] = useState<number | null>(null);

  const rituals = [
    {
      title: 'Ритуал «Ближе»',
      description: 'Синхронизация дыхания, тепла и взгляда.',
      subtitle: 'Идеален для первого погружения.',
      details: 'Мягкое введение в практику банных ритуалов для пар. Через простые, но глубокие упражнения вы учитесь чувствовать дыхание друг друга, синхронизировать движения и присутствовать в моменте. Продолжительность: 1.5 часа.'
    },
    {
      title: 'Тепло в тишине',
      description: 'Без слов, только чувства.',
      subtitle: 'Глубокое погружение в невербальную коммуникацию.',
      details: 'Особый формат, где мы сознательно убираем слова и оставляем только тактильность, взгляды и совместное присутствие. Идеален для пар, которые хотят выйти за пределы привычных способов общения. Продолжительность: 2 часа.'
    },
    {
      title: 'Пар на двоих',
      description: 'Обучение искусству парения друг друга.',
      subtitle: 'Игра, доверие, забота.',
      details: 'Я обучаю вас базовым техникам парения, и вы практикуете их друг на друге. Это не только телесная практика, но и упражнение на доверие, внимание и заботу. Вы уходите с новым совместным навыком. Продолжительность: 2.5 часа.'
    },
    {
      title: 'Свидание с ужином',
      description: 'Ритуал завершается ужином у камина.',
      subtitle: 'С авторским чаем и угощениями.',
      details: 'Полный формат: банный ритуал + завершающая трапеза в уютной комнате отдыха. Лёгкие закуски, травяные чаи, пледы, камин и возможность просто быть вместе после глубокого опыта. Продолжительность: 3 часа.'
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
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
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
          <Button 
            size="lg" 
            className="bg-nature-brown hover:bg-nature-forest text-white px-10 py-6 text-lg shadow-2xl hover:shadow-nature-sand/50 transition-all"
            onClick={() => document.getElementById('rituals')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Забронировать погружение
          </Button>
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
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-serif text-center text-nature-forest mb-12">
            Выберите формат вашей встречи
          </h2>
          <div className="space-y-4">
            {rituals.map((ritual, index) => (
              <Card 
                key={index}
                className="overflow-hidden border-nature-brown/20 hover:border-nature-brown/40 transition-all cursor-pointer"
                onClick={() => setActiveRitual(activeRitual === index ? null : index)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-2xl font-serif text-nature-forest mb-2">{ritual.title}</h3>
                      <p className="text-nature-forest/70 mb-1">{ritual.description}</p>
                      <p className="text-nature-brown text-sm italic">{ritual.subtitle}</p>
                    </div>
                    <Icon 
                      name={activeRitual === index ? "ChevronUp" : "ChevronDown"} 
                      size={24} 
                      className="text-nature-brown flex-shrink-0 ml-4"
                    />
                  </div>
                  {activeRitual === index && (
                    <div className="mt-4 pt-4 border-t border-nature-brown/20">
                      <p className="text-nature-forest/80 leading-relaxed">{ritual.details}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

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
              className="bg-nature-sand hover:bg-nature-sand/90 text-nature-forest px-10 py-6 text-lg shadow-2xl"
            >
              Выбрать дату и время
            </Button>
          </a>
          <p className="text-gray-300 text-sm mt-6">
            Конфиденциальность и ваше комфортное состояние — наш главный приоритет.
          </p>
        </div>
      </section>
    </div>
  );
};

export default WarmDates;
