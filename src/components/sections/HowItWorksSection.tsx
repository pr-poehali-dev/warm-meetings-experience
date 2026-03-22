import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { ORGANIZER_URL } from "@/lib/constants";

export default function HowItWorksSection() {
  return (
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

          <div className="mt-16 text-center px-4">
            <Button 
              size="lg" 
              className="rounded-full text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
              onClick={() => window.open(ORGANIZER_URL, '_blank')}
            >
              Начать общение
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
