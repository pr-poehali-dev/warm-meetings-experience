import { Card } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

export default function RulesSection() {
  return (
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
  );
}
