import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

const TELEGRAM_URL = "https://t.me/sparcom_ru";

export default function Index() {
  const scrollDown = () => {
    window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  };

  const getEventColor = (type: string) => {
    if (type === "Мужская встреча") return "bg-blue-600 text-white";
    if (type === "Женская встреча") return "bg-pink-600 text-white";
    return "bg-purple-600 text-white";
  };

  const upcomingEvents = [
    {
      title: "Мужская баня на берёзовых дровах",
      date: "12 февраля, суббота",
      time: "18:00 — 21:00",
      type: "Мужская встреча",
      price: "2 500 ₽",
      spotsLeft: 3,
      totalSpots: 8,
      description: "Вечерняя встреча для мужчин в аутентичной бане на дровах. Без суеты, с правильным паром и возможностью поговорить о важном в кругу своих."
    },
    {
      title: "Тихая суббота в бане",
      date: "2 марта, суббота",
      time: "12:00 — 16:00",
      type: "Совместная встреча",
      price: "4 500 ₽",
      spotsLeft: 3,
      totalSpots: 12,
      description: "Клубная банная встреча для тех, кому важно пойти в баню спокойно и без неловкости: одна группа, один ритм, трезво и без случайных людей."
    },
    {
      title: "Женский день в бане",
      date: "19 февраля, суббота",
      time: "16:00 — 19:00",
      type: "Женская встреча",
      price: "2 500 ₽",
      spotsLeft: 2,
      totalSpots: 8,
      description: "Дневная встреча для женщин в уютной бане на дровах. Мягкий пар, спокойная атмосфера и время для себя в компании единомышленниц."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Блок 1: Разрешение */}
      <section className="relative h-screen flex items-center justify-center">
        <img 
          src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/69533be6-e8cd-4137-89eb-a06d187922f4.jpg"
          alt="Спокойная пустая баня"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
            В баню можно идти одному.
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-16 font-light max-w-2xl mx-auto">
            Если хочется нормальной бани, но не с кем — это не проблема. СПАРКОМ существует именно для таких ситуаций.
          </p>
          
          <button 
            onClick={scrollDown}
            className="animate-bounce text-white/80 hover:text-white transition-colors"
            aria-label="Прокрутить вниз"
          >
            <Icon name="ChevronDown" size={48} />
          </button>
        </div>
      </section>

      {/* Блок 2: Что это за формат */}
      <section className="py-24 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-semibold mb-8">
              СПАРКОМ — это организованные банные встречи
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
              Мы собираем небольшие группы людей, которым важно спокойствие, уважение и порядок. Есть правила, есть организатор, нет алкоголя и случайных компаний.
            </p>
          </div>
        </div>
      </section>

      {/* Блок 3: Кому подходит / кому нет */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">
              Этот формат подойдёт не всем — и в этом его смысл
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Подходит */}
              <Card className="p-10 bg-card border-0 shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="Check" className="text-green-600" size={24} />
                  </div>
                  <h3 className="text-2xl font-semibold">Подходит, если вы:</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Icon name="Circle" size={8} className="text-accent mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">хотите пойти в баню, даже если идёте один</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Icon name="Circle" size={8} className="text-accent mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">цените спокойный, трезвый формат</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Icon name="Circle" size={8} className="text-accent mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">уважаете личные границы и общее пространство</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Icon name="Circle" size={8} className="text-accent mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">готовы следовать простым правилам</span>
                  </li>
                </ul>
              </Card>

              {/* Не подойдёт */}
              <Card className="p-10 bg-card border-0 shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="X" className="text-red-600" size={24} />
                  </div>
                  <h3 className="text-2xl font-semibold">Не подойдёт, если вы:</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Icon name="Circle" size={8} className="text-muted-foreground/50 mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">ищете тусовку или спонтанность</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Icon name="Circle" size={8} className="text-muted-foreground/50 mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">хотите «как пойдёт» и без рамок</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Icon name="Circle" size={8} className="text-muted-foreground/50 mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">планируете алкоголь</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Icon name="Circle" size={8} className="text-muted-foreground/50 mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">не готовы быть частью группы</span>
                  </li>
                </ul>
              </Card>
            </div>

            <div className="mt-16 text-center">
              <Button 
                size="lg" 
                className="rounded-full text-lg px-8"
                onClick={() => window.open(TELEGRAM_URL, '_blank')}
              >
                <Icon name="MessageCircle" className="mr-2" size={20} />
                Написать организатору
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Блок 4: Ближайшие встречи */}
      <section className="py-24 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold mb-4">
                Ближайшие встречи
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {upcomingEvents.map((event, index) => (
                <Card key={index} className="p-8 bg-card border-0 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-0 right-0">
                    <div className={`${getEventColor(event.type)} px-4 py-1 text-xs font-semibold uppercase tracking-wide`} style={{
                      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 10% 100%)'
                    }}>
                      {event.type}
                    </div>
                  </div>
                  <div className="space-y-5">
                    {event.title && (
                      <h3 className="text-2xl font-bold leading-tight pt-2">{event.title}</h3>
                    )}
                    
                    <div className="space-y-1">
                      <div className="text-base font-medium">
                        <span className="font-semibold">{event.date}</span> · {event.time}
                      </div>
                      {event.totalSpots && (
                        <div className="text-sm text-muted-foreground">
                          Осталось {event.spotsLeft} из {event.totalSpots} мест
                        </div>
                      )}
                    </div>
                    
                    <div className="text-2xl font-bold">{event.price}</div>
                    
                    {event.description && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                    
                    {!event.description && (
                      <div className="py-3 border-y border-border/50">
                        <div className="text-sm text-muted-foreground mb-1">Место</div>
                        <div className="font-medium">{event.venue}</div>
                      </div>
                    )}
                    
                    {!event.description && !event.totalSpots && (
                      <div className="text-sm font-semibold text-accent">
                        Осталось {event.spotsLeft} {event.spotsLeft === 1 ? 'место' : event.spotsLeft < 5 ? 'места' : 'мест'}
                      </div>
                    )}
                    
                    <Button 
                      className="w-full rounded-full"
                      onClick={() => window.open(TELEGRAM_URL, '_blank')}
                    >
                      👉 Посмотреть детали встречи
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Блок 5: Как это работает */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">
              Как это работает
            </h2>
            
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon name="Calendar" className="text-accent" size={36} />
                </div>
                <div className="text-6xl font-bold text-accent/20 mb-4">01</div>
                <h3 className="text-xl font-semibold mb-3">Выберите встречу</h3>
                <p className="text-muted-foreground">
                  Посмотрите календарь и выберите удобную дату
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon name="MessageCircle" className="text-accent" size={36} />
                </div>
                <div className="text-6xl font-bold text-accent/20 mb-4">02</div>
                <h3 className="text-xl font-semibold mb-3">Напишите организатору</h3>
                <p className="text-muted-foreground">
                  Познакомимся, расскажем детали и забронируем место
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon name="Waves" className="text-accent" size={36} />
                </div>
                <div className="text-6xl font-bold text-accent/20 mb-4">03</div>
                <h3 className="text-xl font-semibold mb-3">Приходите и отдыхайте</h3>
                <p className="text-muted-foreground">
                  Всё остальное уже организовано — просто наслаждайтесь
                </p>
              </div>
            </div>

            <div className="mt-16 text-center">
              <Button 
                size="lg" 
                className="rounded-full text-lg px-8"
                onClick={() => window.open(TELEGRAM_URL, '_blank')}
              >
                Начать общение
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Блок 6: Правила */}
      <section className="py-24 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-center">
              Правила встреч
            </h2>
            <p className="text-center text-muted-foreground mb-16 text-lg">
              Они простые, но обязательные для всех
            </p>
            
            <div className="space-y-6">
              <Card className="p-8 bg-card border-0 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="Wine" className="text-accent rotate-45" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Никакого алкоголя</h3>
                    <p className="text-muted-foreground">
                      Трезвый формат — это наше главное отличие и условие безопасности
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-8 bg-card border-0 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="Clock" className="text-accent" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Пунктуальность</h3>
                    <p className="text-muted-foreground">
                      Приходите вовремя. Опоздание нарушает атмосферу для всех
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-8 bg-card border-0 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="Shield" className="text-accent" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Уважение границ</h3>
                    <p className="text-muted-foreground">
                      Если человек хочет побыть в тишине — это нормально и уважаемо
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-8 bg-card border-0 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="Sparkles" className="text-accent" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Чистота и порядок</h3>
                    <p className="text-muted-foreground">
                      После себя оставляем пространство чистым, как будто нас не было
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Блок 7: FAQ */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">
              Частые вопросы
            </h2>
            
            <div className="space-y-6">
              <Card className="p-8 bg-card border-0 shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Это безопасно?</h3>
                <p className="text-muted-foreground">
                  Да. Мы проверяем каждого участника перед встречей, есть чёткие правила и организатор на месте.
                </p>
              </Card>

              <Card className="p-8 bg-card border-0 shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Я интроверт. Мне придётся общаться?</h3>
                <p className="text-muted-foreground">
                  Нет. Можете просто быть рядом и молчать — это нормально и никого не смущает.
                </p>
              </Card>

              <Card className="p-8 bg-card border-0 shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Сколько человек в группе?</h3>
                <p className="text-muted-foreground">
                  Обычно 4–8 человек. Это оптимальное количество для комфорта и атмосферы.
                </p>
              </Card>

              <Card className="p-8 bg-card border-0 shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Что взять с собой?</h3>
                <p className="text-muted-foreground">
                  Полотенце, тапочки, шапочку для бани. Всё остальное — чай, вода, простыни — уже на месте.
                </p>
              </Card>

              <Card className="p-8 bg-card border-0 shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Можно ли отменить?</h3>
                <p className="text-muted-foreground">
                  Да, но предупредите минимум за сутки. Так другой человек сможет занять ваше место.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Финальный CTA */}
      <section className="py-24 md:py-32 bg-accent text-accent-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Готовы попробовать?
            </h2>
            <p className="text-xl mb-12 opacity-90">
              Напишите организатору — ответим на вопросы и подберём встречу
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="rounded-full text-lg px-10"
              onClick={() => window.open(TELEGRAM_URL, '_blank')}
            >
              <Icon name="Send" className="mr-2" size={20} />
              Написать в Telegram
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}