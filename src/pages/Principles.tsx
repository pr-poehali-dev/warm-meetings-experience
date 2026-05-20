import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const HERO_IMG =
  "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/69533be6-e8cd-4137-89eb-a06d187922f4.jpg";

const THEME_STYLES = `
  [data-pri-theme="dark"] {
    --bg-page: linear-gradient(160deg, #1a1410 0%, #1c2018 35%, #14201c 65%, #101818 100%);
    --c-cream: #EDE0CC;
    --c-terra: #C8834A;
    --c-sage:  #8FA89A;
    --c-text:  rgba(217,237,232,0.65);
    --c-muted: rgba(217,237,232,0.45);
    --card-bg: rgba(237,224,204,0.05);
    --card-border: rgba(237,224,204,0.1);
    --hero-overlay: linear-gradient(to bottom, rgba(26,20,16,0.3) 0%, rgba(26,20,16,0.55) 50%, #1a1410 90%);
    --hero-img-opacity: 0.22;
    --step-num-bg: rgba(200,131,74,0.18);
    --badge-bg: rgba(200,131,74,0.15);
    --badge-border: rgba(200,131,74,0.3);
    --soft-divider: rgba(237,224,204,0.08);
    --quote-bg: rgba(143,168,154,0.08);
    --quote-border: rgba(143,168,154,0.25);
  }
  [data-pri-theme="light"] {
    --bg-page: linear-gradient(160deg, #fdf7f0 0%, #f4f8f5 35%, #eef6f4 65%, #eaf4f2 100%);
    --c-cream: #2d2318;
    --c-terra: #b56b2e;
    --c-sage:  #4a7a6a;
    --c-text:  rgba(35,40,38,0.7);
    --c-muted: rgba(35,40,38,0.5);
    --card-bg: rgba(255,255,255,0.8);
    --card-border: rgba(200,131,74,0.15);
    --hero-overlay: linear-gradient(to bottom, rgba(253,247,240,0.15) 0%, rgba(253,247,240,0.5) 50%, #fdf7f0 90%);
    --hero-img-opacity: 0.18;
    --step-num-bg: rgba(181,107,46,0.12);
    --badge-bg: rgba(181,107,46,0.12);
    --badge-border: rgba(181,107,46,0.25);
    --soft-divider: rgba(45,35,24,0.08);
    --quote-bg: rgba(74,122,106,0.08);
    --quote-border: rgba(74,122,106,0.25);
  }
`;

const glassCard: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  backdropFilter: "blur(16px)",
};

type Principle = {
  icon: string;
  title: string;
  text?: string | null;
  detailsPrefix?: string;
  details: string[];
  afterDetails?: string[];
  quote?: string;
  note?: string;
};

const principles: Principle[] = [
  {
    icon: "LayoutList",
    title: "Порядок важнее атмосферы",
    text: "Мы верим, что настоящий комфорт рождается из ясных правил, а не из импровизации.",
    details: ["заранее известно, что будет", "понятно, чего не будет", "нет формата «по ходу разберёмся»"],
    note: "Это снижает напряжение и позволяет расслабиться.",
  },
  {
    icon: "Users",
    title: "Совместность без обязательной коммуникации",
    detailsPrefix: "В нашем клубе можно:",
    details: ["быть рядом", "участвовать", "молчать", "уходить без объяснений"],
    afterDetails: ["Присутствие не требует разговоров.", "Участие не требует вовлечённости."],
    quote: "Мы рядом, но не лезем.",
  },
  {
    icon: "Shield",
    title: "Личные границы — без обсуждений",
    text: "Физические, эмоциональные и социальные границы участников не обсуждаются и не проверяются.",
    details: ["«мне некомфортно» — достаточно", "«нет» — не требует объяснений", "отсутствие желания общаться — норма"],
    note: "Без давления. Без уговоров. Без интерпретаций.",
  },
  {
    icon: "Wine",
    title: "Баня — не место для алкоголя",
    text: "СПАРКОМ — это пространство восстановления, а не разрядки через вещества.",
    detailsPrefix: "Алкоголь:",
    details: ["до встречи", "во время", "после (в рамках формата)"],
    note: "строго исключён.\n\nЭто не вопрос вкуса.\nЭто вопрос безопасности и уважения к другим.",
  },
  {
    icon: "Glasses",
    title: "Взрослость вместо суеты",
    detailsPrefix: "Мы ориентированы на людей, которые:",
    details: ["не хотят договариваться каждый раз", "не ищут «движуху»", "ценят ясность больше скидок"],
    afterDetails: ["Здесь не нужно: доказывать, объяснять, быть удобным."],
    note: "Достаточно быть корректным.",
  },
  {
    icon: "Hand",
    title: "Добровольность на каждом этапе",
    detailsPrefix: "В СПАРКОМ:",
    details: ["участие всегда добровольное", "выход из процесса — нормален", "отказ не требует оправданий"],
    note: "Никто никого не тянет, не уговаривает и не подталкивает.",
  },
  {
    icon: "Coins",
    title: "Совместная модель «в складчину»",
    detailsPrefix: "Базовый формат встреч — в складчину:",
    details: [
      "участники делят между собой стоимость аренды",
      "организатор в складчине не участвует",
      "дополнительные услуги оплачиваются отдельно",
    ],
    note: "Это честная и прозрачная модель без скрытой коммерции.",
  },
  {
    icon: "Crown",
    title: "Ответственность организатора",
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
    icon: "Lock",
    title: "Конфиденциальность по умолчанию",
    detailsPrefix: "То, что происходит:",
    details: ["на встречах", "в чатах", "в личных разговорах"],
    note: "остаётся внутри сообщества, если иное не согласовано заранее.",
  },
  {
    icon: "Gem",
    title: "Мы не для всех — и это осознанно",
    detailsPrefix: "СПАРКОМ подходит тем, кто ценит:",
    details: ["тишину", "порядок", "ясные рамки", "уважение"],
    afterDetails: [
      "Если формат кажется «жёстким» — значит, он работает.",
      "Если кажется «излишним» — возможно, это не ваше место.",
    ],
  },
];

function SectionBadge({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
      style={{ background: "var(--badge-bg)", border: "1px solid var(--badge-border)", color: "var(--c-terra)" }}
    >
      <Icon name={icon as "Flame"} size={13} />
      {children}
    </div>
  );
}

export default function Principles() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <div
      data-pri-theme={isDark ? "dark" : "light"}
      className="min-h-screen relative overflow-x-hidden transition-colors duration-500"
      style={{ background: "var(--bg-page)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(200,131,74,0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[10%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(143,168,154,0.07) 0%, transparent 70%)" }}
        />
      </div>

      <Header transparent />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: "60vh" }}>
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: "var(--hero-img-opacity)" as unknown as number }}
          />
          <div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-32 pb-16 max-w-4xl mx-auto">
          <SectionBadge icon="BookOpen">Документ клуба</SectionBadge>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-5"
            style={{
              background: "linear-gradient(135deg, var(--c-cream) 20%, #C8834A 60%, #8FA89A 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            10 принципов СПАРКОМ
          </h1>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--c-text)" }}>
            СПАРКОМ — это не сервис и не развлекательный клуб. Это пространство
            порядка, тишины и совместного присутствия.
          </p>
        </div>
      </section>

      {/* Principles list */}
      <main className="relative z-10 px-4 sm:px-6 max-w-4xl mx-auto py-16">
        <div className="space-y-4">
          {principles.map((p, i) => (
            <article
              key={i}
              className="rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:brightness-110"
              style={glassCard}
            >
              <div className="flex flex-col sm:flex-row gap-5">
                {/* Left rail: number + icon */}
                <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 shrink-0 sm:w-24">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "var(--step-num-bg)" }}
                  >
                    <Icon name={p.icon as "Shield"} size={24} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
                  </div>
                  <div
                    className="text-3xl font-extrabold leading-none"
                    style={{ color: "var(--c-terra)", opacity: 0.5 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-xl sm:text-2xl font-bold leading-snug mb-3"
                    style={{ color: "var(--c-cream)" }}
                  >
                    {p.title}
                  </h2>

                  {p.text && (
                    <p className="text-sm sm:text-base leading-relaxed mb-3" style={{ color: "var(--c-text)" }}>
                      {p.text}
                    </p>
                  )}

                  {p.detailsPrefix && (
                    <p className="text-sm font-semibold mb-2" style={{ color: "var(--c-cream)" }}>
                      {p.detailsPrefix}
                    </p>
                  )}

                  <ul className="space-y-1.5 mb-3">
                    {p.details.map((d, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>
                        <Icon
                          name="Dot"
                          size={16}
                          className="mt-0 shrink-0"
                          style={{ color: "var(--c-sage)" } as React.CSSProperties}
                        />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>

                  {p.afterDetails && (
                    <div className="space-y-1 mb-3">
                      {p.afterDetails.map((line, k) => (
                        <p key={k} className="text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>
                          {line}
                        </p>
                      ))}
                    </div>
                  )}

                  {p.quote && (
                    <blockquote
                      className="rounded-xl px-4 py-3 mb-3"
                      style={{ background: "var(--quote-bg)", border: "1px solid var(--quote-border)" }}
                    >
                      <p className="text-sm italic" style={{ color: "var(--c-cream)" }}>
                        «{p.quote}»
                      </p>
                    </blockquote>
                  )}

                  {p.note && (
                    <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: "var(--c-muted)" }}>
                      {p.note}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Финальная цитата */}
        <div
          className="mt-12 rounded-2xl p-8 sm:p-10 text-center relative overflow-hidden"
          style={glassCard}
        >
          <div
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(200,131,74,0.25) 0%, transparent 70%)" }}
          />
          <div className="relative">
            <Icon
              name="Quote"
              size={28}
              className="mx-auto mb-4"
              style={{ color: "var(--c-terra)" } as React.CSSProperties}
            />
            <p
              className="text-xl sm:text-2xl font-bold leading-relaxed mb-2"
              style={{ color: "var(--c-cream)" }}
            >
              СПАРКОМ — это не про участие.
            </p>
            <p
              className="text-base sm:text-lg leading-relaxed"
              style={{ color: "var(--c-text)" }}
            >
              Это про возможность не участвовать и при этом быть частью.
            </p>
          </div>
        </div>

        {/* Связанные ссылки */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/about"
            className="rounded-2xl p-5 flex items-center justify-between transition-all hover:brightness-110"
            style={glassCard}
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--c-terra)" }}>
                О клубе
              </div>
              <div className="font-bold text-base" style={{ color: "var(--c-cream)" }}>
                Узнать больше о СПАРКОМ
              </div>
            </div>
            <Icon name="ArrowRight" size={22} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
          </Link>
          <Link
            to="/events"
            className="rounded-2xl p-5 flex items-center justify-between transition-all hover:brightness-110"
            style={glassCard}
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--c-sage)" }}>
                Афиша
              </div>
              <div className="font-bold text-base" style={{ color: "var(--c-cream)" }}>
                Ближайшие встречи
              </div>
            </div>
            <Icon name="Calendar" size={22} style={{ color: "var(--c-sage)" } as React.CSSProperties} />
          </Link>
        </div>

        {/* Back link */}
        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--c-muted)" }}
          >
            <Icon name="ArrowLeft" size={16} />
            Вернуться на главную
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
