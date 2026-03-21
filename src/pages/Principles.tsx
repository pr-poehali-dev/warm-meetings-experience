import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Footer from "@/components/Footer";

const principles = [
  {
    title: "Порядок важнее атмосферы",
    text: "Мы верим, что настоящий комфорт рождается из ясных правил, а не из импровизации.",
    details: [
      "заранее известно, что будет",
      "понятно, чего не будет",
      "нет формата «по ходу разберёмся»",
    ],
    note: "Это снижает напряжение и позволяет расслабиться.",
  },
  {
    title: "Совместность без обязательной коммуникации",
    text: null,
    details: [
      "быть рядом",
      "участвовать",
      "молчать",
      "уходить без объяснений",
    ],
    detailsPrefix: "В нашем клубе можно:",
    afterDetails: [
      "Присутствие не требует разговоров.",
      "Участие не требует вовлечённости.",
    ],
    quote: "Мы рядом, но не лезем.",
  },
  {
    title: "Личные границы — без обсуждений",
    text: "Физические, эмоциональные и социальные границы участников не обсуждаются и не проверяются.",
    details: [
      "«мне некомфортно» — достаточно",
      "«нет» — не требует объяснений",
      "отсутствие желания общаться — норма",
    ],
    note: "Без давления. Без уговоров. Без интерпретаций.",
  },
  {
    title: "Баня — не место для алкоголя",
    text: "СПАРКОМ — это пространство восстановления, а не разрядки через вещества.",
    details: [
      "до встречи",
      "во время",
      "после (в рамках формата)",
    ],
    detailsPrefix: "Алкоголь:",
    note: "строго исключён.\n\nЭто не вопрос вкуса.\nЭто вопрос безопасности и уважения к другим.",
  },
  {
    title: "Взрослость вместо суеты",
    text: null,
    detailsPrefix: "Мы ориентированы на людей, которые:",
    details: [
      "не хотят договариваться каждый раз",
      "не ищут «движуху»",
      "ценят ясность больше скидок",
    ],
    afterDetails: [
      "Здесь не нужно: доказывать, объяснять, быть удобным.",
    ],
    note: "Достаточно быть корректным.",
  },
  {
    title: "Добровольность на каждом этапе",
    text: null,
    detailsPrefix: "В СПАРКОМ:",
    details: [
      "участие всегда добровольное",
      "выход из процесса — нормален",
      "отказ не требует оправданий",
    ],
    note: "Никто никого не тянет, не уговаривает и не подталкивает.",
  },
  {
    title: "Совместная модель «в складчину»",
    text: null,
    detailsPrefix: "Базовый формат встреч — в складчину:",
    details: [
      "участники делят между собой стоимость аренды",
      "организатор в складчине не участвует",
      "дополнительные услуги оплачиваются отдельно",
    ],
    note: "Это честная и прозрачная модель без скрытой коммерции.",
  },
  {
    title: "Ответственность организатора",
    text: null,
    detailsPrefix: "Каждая встреча проводится организатором, который:",
    details: [
      "отвечает за формат",
      "следит за соблюдением правил",
      "принимает решения в моменте",
      "имеет право отказать в участии",
    ],
    note: "Это не привилегия, а ответственность за пространство.",
  },
  {
    title: "Конфиденциальность по умолчанию",
    text: null,
    detailsPrefix: "То, что происходит:",
    details: [
      "на встречах",
      "в чатах",
      "в личных разговорах",
    ],
    note: "остаётся внутри сообщества, если иное не согласовано заранее.",
  },
  {
    title: "Мы не для всех — и это осознанно",
    text: null,
    detailsPrefix: "СПАРКОМ подходит тем, кто ценит:",
    details: [
      "тишину",
      "порядок",
      "ясные рамки",
      "уважение",
    ],
    afterDetails: [
      "Если формат кажется «жёстким» — значит, он работает.",
      "Если кажется «излишним» — возможно, это не ваше место.",
    ],
  },
];

const iconNames = [
  "LayoutList",
  "Users",
  "Shield",
  "Wine",
  "Glasses",
  "Hand",
  "Coins",
  "Crown",
  "Lock",
  "Gem",
] as const;

export default function Principles() {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/"
          className="flex items-center gap-2 bg-foreground/5 backdrop-blur-md border border-foreground/10 text-foreground px-4 py-2 rounded-full hover:bg-foreground/10 transition-colors text-sm font-medium"
        >
          <Icon name="ArrowLeft" size={16} />
          <span className="hidden sm:inline">Главная</span>
        </Link>
      </div>

      <header className="pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Принципы клуба СПАРКОМ
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            СПАРКОМ — это не сервис и не развлекательный клуб.
            Это пространство порядка, тишины и совместного присутствия.
          </p>
          <p className="text-base text-muted-foreground/80 mt-4">
            Ниже — принципы, на которых держится всё: формат встреч, правила, коммуникация и решения.
          </p>
        </div>
      </header>

      <main className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="space-y-12 md:space-y-16">
            {principles.map((p, i) => (
              <article key={i} className="group">
                <div className="flex items-start gap-4 md:gap-5 mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-foreground/5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm md:text-base font-semibold text-foreground/50">
                      {i + 1}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-semibold leading-snug pt-1.5 md:pt-2">
                    {p.title}
                  </h2>
                </div>

                <div className="ml-14 md:ml-[68px] space-y-4">
                  {p.text && (
                    <p className="text-muted-foreground leading-relaxed">
                      {p.text}
                    </p>
                  )}

                  {p.detailsPrefix && (
                    <p className="text-muted-foreground font-medium">
                      {p.detailsPrefix}
                    </p>
                  )}

                  <ul className="space-y-2">
                    {p.details.map((d, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="text-foreground/30 mt-1.5 select-none">—</span>
                        <span className="text-muted-foreground leading-relaxed">{d}</span>
                      </li>
                    ))}
                  </ul>

                  {p.afterDetails && (
                    <div className="space-y-1">
                      {p.afterDetails.map((line, k) => (
                        <p key={k} className="text-muted-foreground leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>
                  )}

                  {p.quote && (
                    <blockquote className="border-l-2 border-foreground/20 pl-4 py-1">
                      <p className="text-foreground/70 italic">{p.quote}</p>
                    </blockquote>
                  )}

                  {p.note && (
                    <p className="text-foreground/60 text-sm leading-relaxed whitespace-pre-line">
                      {p.note}
                    </p>
                  )}
                </div>

                {i < principles.length - 1 && (
                  <div className="mt-12 md:mt-16 border-t border-foreground/5" />
                )}
              </article>
            ))}
          </div>

          <div className="mt-20 md:mt-28 pt-12 border-t border-foreground/10">
            <p className="text-xl md:text-2xl font-semibold text-center leading-relaxed">
              СПАРКОМ — это не про участие.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground text-center mt-2 leading-relaxed">
              Это про возможность не участвовать и при этом быть частью.
            </p>
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <Icon name="ArrowLeft" size={16} />
              Вернуться на главную
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
