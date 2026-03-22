import { Card } from "@/components/ui/card";

export default function FAQSection() {
  return (
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
  );
}
