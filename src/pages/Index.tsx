import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

const TELEGRAM_URL = "https://t.me/sparcom_ru";

export default function Index() {
  const scrollDown = () => {
    window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  };

  const upcomingEvents = [
    {
      date: "12 февраля, суббота",
      time: "18:00 — 21:00",
      type: "Мужская встреча",
      venue: "Баня на дровах «Берёзка»",
      price: "2 500 ₽",
      spotsLeft: 3
    },
    {
      date: "15 февраля, вторник",
      time: "19:00 — 22:00",
      type: "Совместная встреча",
      venue: "Баня «Источник»",
      price: "3 000 ₽",
      spotsLeft: 5
    },
    {
      date: "19 февраля, суббота",
      time: "16:00 — 19:00",
      type: "Женская встреча",
      venue: "Баня на дровах «Берёзка»",
      price: "2 500 ₽",
      spotsLeft: 2
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Блок 1: Главный экран */}
      <section className="relative h-screen flex items-center justify-center">
        <img 
          src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/69533be6-e8cd-4137-89eb-a06d187922f4.jpg"
          alt="Спокойная пустая баня"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
            Баня, куда можно прийти одному.<br />
            Без неловкости и лишних разговоров.
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-16 font-light">
            Собираем проверенные компании для спокойных встреч вскладчину
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

      {/* Блок 2: Принципы */}
      <section className="py-24 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">
              Почему нам можно доверять
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-10 bg-card border-0 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="Clock" className="text-accent" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold">Чёткие правила</h3>
                </div>
                <p className="text-muted-foreground">
                  Всё по расписанию. Никаких опозданий и спонтанных тостов.
                </p>
              </Card>

              <Card className="p-10 bg-card border-0 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="Shield" className="text-accent" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold">Ваш покой — закон</h3>
                </div>
                <p className="text-muted-foreground">
                  Можно не участвовать в разговорах. Никто не будет вас трогать.
                </p>
              </Card>

              <Card className="p-10 bg-card border-0 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="CheckCircle" className="text-accent" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold">Всё уже организовано</h3>
                </div>
                <p className="text-muted-foreground">
                  Вы только приходите. Баня, компания, мастер — всё готово.
                </p>
              </Card>

              <Card className="p-10 bg-card border-0 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="Users" className="text-accent" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold">Только свои</h3>
                </div>
                <p className="text-muted-foreground">
                  Мы проверяем участников. Никаких случайных людей.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Блок 3: Ближайшие встречи */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold mb-4">
                Ближайшие встречи
              </h2>
              <p className="text-lg text-muted-foreground">
                Это не просто сайт — живое сообщество с планом
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {upcomingEvents.map((event, index) => (
                <Card key={index} className="p-8 bg-card border-0 shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-accent mb-2">{event.type}</div>
                      <div className="text-lg font-semibold mb-1">{event.date}</div>
                      <div className="text-sm text-muted-foreground">{event.time}</div>
                    </div>
                    
                    <div className="py-4 border-y border-border/50">
                      <div className="text-sm text-muted-foreground mb-1">Место</div>
                      <div className="font-medium">{event.venue}</div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{event.price}</div>
                        <div className="text-xs text-muted-foreground">с человека</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-accent">
                          Осталось {event.spotsLeft} {event.spotsLeft === 1 ? 'место' : event.spotsLeft < 5 ? 'места' : 'мест'}
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full rounded-full"
                      onClick={() => window.open(TELEGRAM_URL, '_blank')}
                    >
                      Узнать подробности
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Блок 4: Как это работает */}
      <section className="py-24 md:py-32 bg-muted/30">
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
                <h3 className="text-xl font-semibold mb-3">Напишите в Telegram</h3>
                <p className="text-muted-foreground">
                  Запишитесь одним сообщением
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon name="Sparkles" className="text-accent" size={36} />
                </div>
                <div className="text-6xl font-bold text-accent/20 mb-4">03</div>
                <h3 className="text-xl font-semibold mb-3">Приходите</h3>
                <p className="text-muted-foreground">
                  В назначенное время. Всё готово
                </p>
              </div>
            </div>

            <div className="mt-16 p-8 bg-accent/5 rounded-2xl border-l-4 border-accent text-center">
              <p className="text-lg font-medium">
                Никаких регистраций, личных кабинетов и предоплат.<br />
                Решаем всё в простом диалоге.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Блок 5: Финальный призыв */}
      <section className="py-24 md:py-32 bg-accent text-accent-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Посмотреть, что на этой неделе?
            </h2>
            <p className="text-xl md:text-2xl mb-12 opacity-90 font-light">
              Напишите нам в Telegram. Мы пришлём актуальное расписание<br />
              и ответим на любые вопросы за 2 минуты.
            </p>
            
            <Button 
              size="lg"
              className="text-lg px-12 py-6 h-auto bg-background text-foreground hover:bg-background/90 rounded-full font-semibold shadow-xl hover:shadow-2xl transition-all"
              onClick={() => window.open(TELEGRAM_URL, '_blank')}
            >
              <Icon name="Send" className="mr-3" size={24} />
              Написать в Telegram
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-border/50 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-xl font-semibold">SPARCOM</div>
            <p className="text-sm text-muted-foreground">© 2026 SPARCOM. Москва.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}