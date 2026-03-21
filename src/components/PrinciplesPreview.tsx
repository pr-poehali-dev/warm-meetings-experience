import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

const principles = [
  { title: "Порядок важнее атмосферы", desc: "Настоящий комфорт рождается из ясных правил, а не из импровизации." },
  { title: "Совместность без обязательной коммуникации", desc: "Можно быть рядом, участвовать, молчать и уходить без объяснений." },
  { title: "Личные границы — без обсуждений", desc: "«Мне некомфортно» — достаточно. «Нет» — не требует объяснений." },
  { title: "Баня — не место для алкоголя", desc: "Пространство восстановления, а не разрядки через вещества." },
  { title: "Взрослость вместо суеты", desc: "Здесь не нужно доказывать, объяснять или быть удобным." },
  { title: "Добровольность на каждом этапе", desc: "Участие добровольное, выход — нормален, отказ не требует оправданий." },
  { title: "Совместная модель «в складчину»", desc: "Честная и прозрачная модель — участники делят стоимость аренды." },
  { title: "Ответственность организатора", desc: "Организатор отвечает за формат, правила и решения в моменте." },
  { title: "Конфиденциальность по умолчанию", desc: "Всё, что происходит на встречах и в чатах, остаётся внутри." },
  { title: "Мы не для всех — и это осознанно", desc: "Если формат кажется «жёстким» — значит, он работает." },
];

const VISIBLE_COUNT = 4;

export default function PrinciplesPreview() {
  const [expanded, setExpanded] = useState(false);
  const visiblePrinciples = expanded ? principles : principles.slice(0, VISIBLE_COUNT);

  return (
    <section className="py-24 md:py-32 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              Принципы СПАРКОМ
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              На этих принципах держится всё: формат, правила, коммуникация и решения
            </p>
          </div>

          <div className="space-y-4">
            {visiblePrinciples.map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-5 md:p-6 bg-card rounded-lg border border-border/50 transition-all duration-300"
                style={{
                  animation: i >= VISIBLE_COUNT ? `fadeSlideIn 0.3s ease-out ${(i - VISIBLE_COUNT) * 0.05}s both` : undefined,
                }}
              >
                <div className="w-8 h-8 bg-foreground/5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-foreground/40">{i + 1}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base md:text-lg mb-1">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {!expanded && (
            <div className="relative -mt-16 pt-20 bg-gradient-to-t from-[hsl(var(--muted)/0.2)] to-transparent pointer-events-none">
              <div className="pointer-events-auto text-center">
                <Button
                  variant="outline"
                  className="rounded-full px-6"
                  onClick={() => setExpanded(true)}
                >
                  <Icon name="ChevronDown" size={16} className="mr-2" />
                  Показать все {principles.length} принципов
                </Button>
              </div>
            </div>
          )}

          {expanded && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <Button
                variant="outline"
                className="rounded-full px-6"
                onClick={() => setExpanded(false)}
              >
                <Icon name="ChevronUp" size={16} className="mr-2" />
                Свернуть
              </Button>
              <Link to="/principles">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  Подробнее о принципах
                  <Icon name="ArrowRight" size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
