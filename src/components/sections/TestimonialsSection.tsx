import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

export default function TestimonialsSection() {
  return (
    <section className="py-20 px-6 bg-nature-forest">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-serif font-light text-nature-cream mb-16">
          Истории трансформаций
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-nature-cream/95 border-nature-brown/20">
            <CardContent className="p-8">
              <Icon name="Quote" size={32} className="text-nature-brown mb-4" />
              <p className="text-nature-forest/80 italic mb-6 leading-relaxed">
                «После вечера я не просто познакомился с людьми, я вспомнил, 
                каково это — общаться без фона, без спешки, просто быть с другими людьми.»
              </p>
              <p className="text-nature-brown font-medium">— Михаил</p>
            </CardContent>
          </Card>
          
          <Card className="bg-nature-cream/95 border-nature-brown/20">
            <CardContent className="p-8">
              <Icon name="Quote" size={32} className="text-nature-brown mb-4" />
              <p className="text-nature-forest/80 italic mb-6 leading-relaxed">
                «Наша команда открыла друг друга заново. Мы стали не просто коллегами, 
                а людьми, которые доверяют и понимают друг друга.»
              </p>
              <p className="text-nature-brown font-medium">— Елена</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}