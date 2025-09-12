import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

export default function PrinciplesSection() {
  return (
    <section className="py-20 px-6 bg-nature-beige">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-serif font-light text-nature-forest text-center mb-16">
          Не правила, а моя философия общения.
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-nature-cream border-nature-brown/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-8 text-center">
              <Icon name="Shield" size={48} className="text-nature-brown mx-auto mb-6" />
              <h3 className="text-xl font-serif font-medium text-nature-forest mb-4">
                Безопасность выше всего
              </h3>
              <p className="text-nature-forest/70 leading-relaxed">
                Здесь можно быть тихим, уставшим, уязвимым. Здесь не учат и не оценивают.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-nature-cream border-nature-brown/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-8 text-center">
              <Icon name="Heart" size={48} className="text-nature-brown mx-auto mb-6" />
              <h3 className="text-xl font-serif font-medium text-nature-forest mb-4">
                Глубина, а не интенсивность
              </h3>
              <p className="text-nature-forest/70 leading-relaxed">
                Мы не гонимся за жаром. Мы идём к сути — ваших чувств, ваших мыслей, вашей связи с другими.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-nature-cream border-nature-brown/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-8 text-center">
              <Icon name="Leaf" size={48} className="text-nature-brown mx-auto mb-6" />
              <h3 className="text-xl font-serif font-medium text-nature-forest mb-4">
                Ритуал как язык
              </h3>
              <p className="text-nature-forest/70 leading-relaxed">
                Совместное приготовление пара, чайная церемония, молчаливое парение — это наш способ говорить без слов.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}