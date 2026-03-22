import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { ORGANIZER_URL } from "@/lib/constants";

export default function AudienceSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">
            Этот формат подойдёт не всем — и в этом его смысл
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
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

          <div className="mt-16 text-center px-4">
            <Button 
              size="lg" 
              className="rounded-full text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
              onClick={() => window.open(ORGANIZER_URL, '_blank')}
            >
              <Icon name="MessageCircle" className="mr-2" size={20} />
              Написать организатору
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
