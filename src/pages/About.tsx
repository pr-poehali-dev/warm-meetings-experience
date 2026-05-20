import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const HERO_IMG =
  "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/69533be6-e8cd-4137-89eb-a06d187922f4.jpg";

const THEME_STYLES = `
  [data-about-theme="dark"] {
    --bg-page: linear-gradient(160deg, #1a1410 0%, #1c2018 35%, #14201c 65%, #101818 100%);
    --c-cream: #EDE0CC;
    --c-terra: #C8834A;
    --c-sage:  #8FA89A;
    --c-text:  rgba(217,237,232,0.6);
    --c-muted: rgba(217,237,232,0.45);
    --glass-bg: rgba(237,224,204,0.06);
    --glass-border: rgba(237,224,204,0.13);
    --hero-overlay: linear-gradient(to bottom, rgba(26,20,16,0.3) 0%, rgba(26,20,16,0.55) 50%, #1a1410 90%);
    --hero-img-opacity: 0.25;
    --card-bg: rgba(237,224,204,0.05);
    --card-border: rgba(237,224,204,0.1);
    --step-num-bg: rgba(200,131,74,0.18);
    --badge-bg: rgba(200,131,74,0.15);
    --badge-border: rgba(200,131,74,0.3);
    --soft-divider: rgba(237,224,204,0.08);
    --success-bg: rgba(143,168,154,0.1);
    --success-border: rgba(143,168,154,0.25);
    --warn-bg: rgba(200,131,74,0.08);
    --warn-border: rgba(200,131,74,0.22);
  }
  [data-about-theme="light"] {
    --bg-page: linear-gradient(160deg, #fdf7f0 0%, #f4f8f5 35%, #eef6f4 65%, #eaf4f2 100%);
    --c-cream: #2d2318;
    --c-terra: #b56b2e;
    --c-sage:  #4a7a6a;
    --c-text:  rgba(35,40,38,0.68);
    --c-muted: rgba(35,40,38,0.5);
    --glass-bg: rgba(255,255,255,0.7);
    --glass-border: rgba(200,131,74,0.15);
    --hero-overlay: linear-gradient(to bottom, rgba(253,247,240,0.15) 0%, rgba(253,247,240,0.5) 50%, #fdf7f0 90%);
    --hero-img-opacity: 0.18;
    --card-bg: rgba(255,255,255,0.8);
    --card-border: rgba(200,131,74,0.15);
    --step-num-bg: rgba(181,107,46,0.12);
    --badge-bg: rgba(181,107,46,0.12);
    --badge-border: rgba(181,107,46,0.25);
    --soft-divider: rgba(45,35,24,0.08);
    --success-bg: rgba(74,122,106,0.1);
    --success-border: rgba(74,122,106,0.22);
    --warn-bg: rgba(181,107,46,0.08);
    --warn-border: rgba(181,107,46,0.22);
  }
`;

const glassCard: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  backdropFilter: "blur(16px)",
};

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

const FIT = [
  "хотите пойти в баню, даже если идёте один",
  "цените спокойный, трезвый формат",
  "уважаете личные границы и общее пространство",
  "готовы следовать простым правилам",
];

const NOT_FIT = [
  "ищете тусовку или спонтанность",
  "хотите «как пойдёт» и без рамок",
  "планируете алкоголь",
  "не готовы быть частью группы",
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

function SectionHeading({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3" style={{ color: "var(--c-cream)" }}>
        {children}
      </h2>
      {subtitle && (
        <p className="text-base max-w-2xl mx-auto" style={{ color: "var(--c-text)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function About() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <div
      data-about-theme={isDark ? "dark" : "light"}
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
      <section className="relative overflow-hidden" style={{ minHeight: "70vh" }}>
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: "var(--hero-img-opacity)" as unknown as number }}
          />
          <div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-32 pb-20 max-w-4xl mx-auto">
          <SectionBadge icon="Flame">О клубе</SectionBadge>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-5"
            style={{
              background: "linear-gradient(135deg, var(--c-cream) 20%, #C8834A 60%, #8FA89A 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            СПАРКОМ — банный клуб для взрослых людей
          </h1>

          <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed" style={{ color: "var(--c-text)" }}>
            Мы собираем небольшие группы людей, которым важно спокойствие,
            уважение и порядок. Есть правила, есть организатор, нет алкоголя
            и случайных компаний.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #C8834A, #b56b2e)",
                color: "#fff",
                boxShadow: "0 8px 24px rgba(200,131,74,0.35)",
              }}
            >
              <Icon name="Calendar" size={16} />
              Ближайшие события
            </Link>
            <Link
              to="/principles"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ ...glassCard, color: "var(--c-cream)" }}
            >
              <Icon name="BookOpen" size={16} />
              10 принципов
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mt-12 w-full max-w-2xl">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className="text-2xl sm:text-3xl font-extrabold"
                  style={{
                    background: "linear-gradient(135deg,#C8834A,#8FA89A)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {s.value}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Миссия */}
      <section className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto py-20">
        <SectionHeading subtitle="Зачем мы это делаем — и для кого создаём пространство.">
          Наша миссия
        </SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-6" style={glassCard}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--step-num-bg)" }}>
              <Icon name="Sparkles" size={20} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
            </div>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--c-text)" }}>
              В баню можно идти одному. Если хочется настоящей бани, но не с кем —
              это не проблема. СПАРКОМ существует именно для таких ситуаций.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>
              Мы создаём пространство, где можно отдыхать рядом с другими людьми,
              не подстраиваясь и не объясняясь. Где порядок важнее импровизации,
              а тишина — норма, а не проблема.
            </p>
          </div>

          <div className="rounded-2xl p-6" style={glassCard}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--step-num-bg)" }}>
              <Icon name="Leaf" size={20} style={{ color: "var(--c-sage)" } as React.CSSProperties} />
            </div>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--c-text)" }}>
              Наш формат — для тех, кто ценит ясность, спокойствие и уважение.
              Не для всех — и это осознанный выбор.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>
              Мы верим, что хорошая баня — это не про «движуху». Это про
              восстановление, тишину и возможность быть собой без лишних усилий.
            </p>
          </div>
        </div>
      </section>

      {/* Ценности */}
      <section className="relative z-10 px-4 sm:px-6 max-w-6xl mx-auto py-20">
        <SectionHeading subtitle="Шесть вещей, на которых построен клуб. Без них СПАРКОМ не СПАРКОМ.">
          Наши ценности
        </SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
              style={glassCard}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "var(--step-num-bg)" }}
              >
                <Icon name={v.icon as "ShieldCheck"} size={20} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: "var(--c-cream)" }}>{v.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Правила */}
      <section className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto py-20">
        <SectionHeading subtitle="Простые правила, которые делают каждую встречу комфортной для всех.">
          Правила встреч
        </SectionHeading>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {RULES.map((r) => (
            <div key={r.title} className="rounded-2xl p-5 flex gap-4" style={glassCard}>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--step-num-bg)" }}
              >
                <Icon name={r.icon as "Wine"} size={20} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1" style={{ color: "var(--c-cream)" }}>{r.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Для кого */}
      <section className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto py-20">
        <SectionHeading subtitle="Честно про формат: для кого мы и кому лучше выбрать что-то другое.">
          Для кого СПАРКОМ
        </SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Это для вас */}
          <div
            className="rounded-2xl p-6"
            style={{ ...glassCard, background: "var(--success-bg)", border: "1px solid var(--success-border)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(143,168,154,0.18)" }}
              >
                <Icon name="Check" size={20} style={{ color: "var(--c-sage)" } as React.CSSProperties} />
              </div>
              <h3 className="font-bold text-base" style={{ color: "var(--c-cream)" }}>
                Это для вас, если вы:
              </h3>
            </div>
            <ul className="space-y-3">
              {FIT.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--c-text)" }}>
                  <Icon name="Check" size={14} className="mt-1 shrink-0" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Это не для вас */}
          <div
            className="rounded-2xl p-6"
            style={{ ...glassCard, background: "var(--warn-bg)", border: "1px solid var(--warn-border)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(200,131,74,0.18)" }}
              >
                <Icon name="X" size={20} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
              </div>
              <h3 className="font-bold text-base" style={{ color: "var(--c-cream)" }}>
                Это не для вас, если вы:
              </h3>
            </div>
            <ul className="space-y-3">
              {NOT_FIT.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--c-text)" }}>
                  <Icon name="X" size={14} className="mt-1 shrink-0" style={{ color: "var(--c-terra)" } as React.CSSProperties} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 10 принципов CTA */}
      <section className="relative z-10 px-4 sm:px-6 max-w-4xl mx-auto py-20">
        <div className="rounded-2xl p-8 sm:p-10 text-center relative overflow-hidden" style={glassCard}>
          <div
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(200,131,74,0.25) 0%, transparent 70%)" }}
          />
          <div className="relative">
            <SectionBadge icon="BookOpen">Принципы</SectionBadge>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ color: "var(--c-cream)" }}>
              10 принципов СПАРКОМ
            </h2>
            <p className="text-sm max-w-lg mx-auto mb-6 leading-relaxed" style={{ color: "var(--c-text)" }}>
              Мы сформулировали 10 принципов, которые определяют всё — от формата
              встреч до общения внутри сообщества.
            </p>
            <Link
              to="/principles"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
              style={{ ...glassCard, color: "var(--c-cream)" }}
            >
              Читать принципы
              <Icon name="ArrowRight" size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Финальный CTA */}
      <section className="relative z-10 px-4 sm:px-6 max-w-4xl mx-auto pb-20">
        <div
          className="rounded-2xl p-8 sm:p-10 text-center relative overflow-hidden"
          style={{
            ...glassCard,
            border: "1px solid rgba(200,131,74,0.35)",
            boxShadow: "0 8px 32px rgba(200,131,74,0.18)",
          }}
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ color: "var(--c-cream)" }}>
            Хотите попробовать?
          </h2>
          <p className="text-sm max-w-lg mx-auto mb-6 leading-relaxed" style={{ color: "var(--c-text)" }}>
            Выберите ближайшую встречу, напишите организатору — и просто приходите.
            Никаких обязательств, никакого давления.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/events"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #C8834A, #b56b2e)",
                color: "#fff",
                boxShadow: "0 8px 24px rgba(200,131,74,0.35)",
              }}
            >
              <Icon name="Calendar" size={16} />
              Ближайшие события
            </Link>
            <a
              href="http://t.me/banya_live"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ ...glassCard, color: "var(--c-cream)" }}
            >
              <Icon name="Send" size={16} />
              Telegram-канал
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
