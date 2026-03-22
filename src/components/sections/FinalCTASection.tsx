import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { TELEGRAM_URL } from "@/lib/constants";

export default function FinalCTASection() {
  return (
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
            className="rounded-full text-base sm:text-lg px-6 sm:px-10 w-full sm:w-auto max-w-md mx-auto"
            onClick={() => window.open(TELEGRAM_URL, '_blank')}
          >
            <Icon name="Send" className="mr-2" size={20} />
            Написать в Telegram
          </Button>
        </div>
      </div>
    </section>
  );
}
