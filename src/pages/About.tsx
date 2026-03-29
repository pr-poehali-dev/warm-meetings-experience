import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

const VALUES = [
  {
    icon: "ShieldCheck",
    title: "Безопасность",
    text: "Трезвый формат, проверенные участники и организатор, который отвечает за пространство.",
  },
  {
    icon: "Heart",
    title: "Уважение",
    text: "Личные границы — не обсуждаются. «Нет» не требует объяснений, тишина — не повод для беспокойства.",
  },
  {
    icon: "ListChecks",
    title: "Порядок",
    text: "Заранее известно, что будет и чего не будет. Нет формата «по ходу разберёмся».",
  },
  {
    icon: "Users",
    title: "Совместность без давления",
    text: "Можно быть рядом, участвовать, молчать или уйти — без объяснений и без обид.",
  },
  {
    icon: "Eye",
    title: "Прозрачность",
    text: "Честная модель «в складчину». Никакой скрытой коммерции, все условия — заранее.",
  },
  {
    icon: "Lock",
    title: "Конфиденциальность",
    text: "Всё, что происходит на встречах, в чатах и разговорах — остаётся внутри сообщества.",
  },
];

const RULES = [
  {
    icon: "Wine",
    title: "Никакого алкоголя",
    text: "До, во время и после встречи — строго исключён. Это вопрос безопасности.",
  },
  {
    icon: "Clock",
    title: "Пунктуальность",
    text: "Приходите вовремя. Опоздание нарушает атмосферу для всех участников.",
  },
  {
    icon: "HandMetal",
    title: "Уважение границ",
    text: "Если человек хочет побыть в тишине — это нормально и уважаемо.",
  },
  {
    icon: "Sparkles",
    title: "Чистота и порядок",
    text: "После себя оставляем пространство чистым, как будто нас не было.",
  },
];

const STATS = [
  { value: "120+", label: "встреч проведено" },
  { value: "3 500+", label: "участников побывало" },
  { value: "24", label: "организатора" },
  { value: "10", label: "принципов клуба" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <section className="bg-foreground text-background py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
          <p className="text-background/50 uppercase tracking-widest text-xs font-medium mb-4">О клубе</p>
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            СПАРКОМ — банный клуб<br className="hidden sm:block" /> для взрослых людей
          </h1>
          <p className="text-background/70 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
            Мы собираем небольшие группы людей, которым важно спокойствие, уважение и порядок. 
            Есть правила, есть организатор, нет алкоголя и случайных компаний.
          </p>
        </div>
      </section>

      <section className="py-14 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-3xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-muted-foreground uppercase tracking-widest text-xs font-medium mb-2">Миссия</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Зачем мы это делаем</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                В баню можно идти одному. Если хочется настоящей бани, но не с кем — это не проблема. 
                СПАРКОМ существует именно для таких ситуаций.
              </p>
              <p className="text-foreground/90 leading-relaxed">
                Мы создаём пространство, где можно отдыхать рядом с другими людьми, не подстраиваясь 
                и не объясняясь. Где порядок важнее импровизации, а тишина — норма, а не проблема.
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                Наш формат — для тех, кто ценит ясность, спокойствие и уважение. Не для всех — 
                и это осознанный выбор.
              </p>
              <p className="text-foreground/90 leading-relaxed">
                Мы верим, что хорошая баня — это не про «движуху». Это про восстановление, 
                тишину и возможность быть собой без лишних усилий.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-muted/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-muted-foreground uppercase tracking-widest text-xs font-medium mb-2">Основа</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Наши ценности</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-card rounded-xl p-6 border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon name={v.icon} size={20} className="text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-muted-foreground uppercase tracking-widest text-xs font-medium mb-2">Правила</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Правила встреч</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Простые правила, которые делают каждую встречу комфортной для всех
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {RULES.map((r) => (
              <div key={r.title} className="flex gap-4 p-5 rounded-xl border border-border bg-card">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <Icon name={r.icon} size={20} className="text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{r.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-muted/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-muted-foreground uppercase tracking-widest text-xs font-medium mb-2">Формат</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Для кого СПАРКОМ</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Icon name="Check" size={16} className="text-green-600" />
                </div>
                <h3 className="font-semibold text-foreground">Это для вас, если вы:</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "хотите пойти в баню, даже если идёте один",
                  "цените спокойный, трезвый формат",
                  "уважаете личные границы и общее пространство",
                  "готовы следовать простым правилам",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <Icon name="Check" size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Icon name="X" size={16} className="text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground">Это не для вас, если вы:</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "ищете тусовку или спонтанность",
                  "хотите «как пойдёт» и без рамок",
                  "планируете алкоголь",
                  "не готовы быть частью группы",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <Icon name="X" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
          <p className="text-muted-foreground uppercase tracking-widest text-xs font-medium mb-2">Принципы</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">10 принципов СПАРКОМ</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Мы сформулировали 10 принципов, которые определяют всё — от формата встреч до общения внутри сообщества.
          </p>
          <Link to="/principles">
            <Button variant="outline" size="lg" className="rounded-full gap-2">
              Читать принципы
              <Icon name="ArrowRight" size={16} />
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-foreground text-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Хотите попробовать?
          </h2>
          <p className="text-background/60 mb-8 max-w-lg mx-auto">
            Выберите ближайшую встречу, напишите организатору — и просто приходите.
            Никаких обязательств, никакого давления.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/events">
              <Button size="lg" className="rounded-full gap-2 bg-background text-foreground hover:bg-background/90 w-full sm:w-auto">
                <Icon name="Calendar" size={16} />
                Ближайшие встречи
              </Button>
            </Link>
            <a href="http://t.me/banya_live" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="rounded-full gap-2 border-background/20 text-background hover:bg-background/10 w-full sm:w-auto">
                <Icon name="Send" size={16} />
                Telegram-канал
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
