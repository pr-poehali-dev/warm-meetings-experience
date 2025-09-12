import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

export default function ContactSection() {
  return (
    <section className="py-20 px-6 bg-nature-cream">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-serif font-light text-nature-forest mb-8">
          Готовы сделать шаг к настоящему?
        </h2>
        <p className="text-xl text-nature-forest/80 mb-12 max-w-2xl mx-auto leading-relaxed">
          Если мои слова отозвались в вас — напишите мне. Даже если вы ещё не готовы записаться. 
          Давайте просто поговорим.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg"
            className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream px-8 py-4 rounded-full transition-all duration-300 hover:scale-105"
            asChild
          >
            <a href="https://t.me/DmitryChikin" target="_blank" rel="noopener noreferrer">
              <Icon name="MessageCircle" size={20} className="mr-2" />
              Написать в Telegram
            </a>
          </Button>
          <Button 
            size="lg"
            variant="outline"
            className="border-nature-brown text-nature-brown hover:bg-nature-brown hover:text-nature-cream px-8 py-4 rounded-full transition-all duration-300 hover:scale-105"
          >
            <Icon name="Users" size={20} className="mr-2" />
            Обсудить тимбилдинг
          </Button>
        </div>
      </div>
    </section>
  );
}