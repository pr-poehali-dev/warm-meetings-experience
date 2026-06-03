import Icon from "@/components/ui/icon";
import { FORMATS, HOW, RULES, glassCard, SectionBadge, SectionHeading } from "./IndexShared";

export default function IndexInfoSections() {
  return (
    <>
      {/* ══ FORMATS ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="LayoutGrid">Форматы</SectionBadge>
            <SectionHeading>Найди свой формат</SectionHeading>
            <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--c-muted)" }}>
              От тихой медитации до делового нетворкинга — каждый найдёт своё пространство.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FORMATS.map((f) => (
              <div key={f.title} className="rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:brightness-105" style={glassCard}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.25)" }}>
                  <Icon name={f.icon as "Flame"} size={20} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
                </div>
                <h3 className="font-bold text-sm mb-2" style={{ color: "var(--c-cream)" }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--c-muted)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHO IS THIS FOR ══════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="Users">Для кого</SectionBadge>
            <SectionHeading>Этот формат подойдёт не всем — и в этом его смысл</SectionHeading>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="rounded-2xl p-7" style={glassCard}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(143,168,154,0.2)", border: "1px solid rgba(143,168,154,0.3)" }}>
                  <Icon name="Check" size={18} style={{ color: "var(--c-sage)" } as React.CSSProperties} />
                </div>
                <h3 className="font-bold text-lg" style={{ color: "var(--c-cream)" }}>Подходит, если вы:</h3>
              </div>
              <ul className="space-y-3">
                {["хотите пойти в баню, даже если идёте один", "цените спокойный, трезвый формат", "уважаете личные границы и общее пространство", "готовы следовать простым правилам"].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--c-text)" }}>
                    <Icon name="Circle" size={6} className="flex-shrink-0 mt-1.5" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-7" style={glassCard}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <Icon name="X" size={18} style={{ color: "#f87171" } as React.CSSProperties} />
                </div>
                <h3 className="font-bold text-lg" style={{ color: "var(--c-cream)" }}>Не подойдёт, если вы:</h3>
              </div>
              <ul className="space-y-3">
                {["ищете тусовку или спонтанность", "хотите «как пойдёт» и без рамок", "планируете алкоголь", "не готовы быть частью группы"].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--c-text)" }}>
                    <Icon name="Circle" size={6} className="flex-shrink-0 mt-1.5" style={{ color: "rgba(239,68,68,0.4)" } as React.CSSProperties} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="Route">Как работает</SectionBadge>
            <SectionHeading>Три шага до встречи</SectionHeading>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {HOW.map((h, i) => (
              <div key={h.n} className="relative">
                <div className="rounded-2xl p-7 h-full" style={glassCard}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(200,131,74,0.12)", border: "1px solid rgba(200,131,74,0.2)" }}>
                    <Icon name={h.icon as "CalendarDays"} size={22} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
                  </div>
                  <div className="text-5xl font-black mb-3" style={{ background: "linear-gradient(135deg,#C8834A,#8FA89A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.5 }}>{h.n}</div>
                  <h3 className="font-bold mb-2 text-sm" style={{ color: "var(--c-cream)" }}>{h.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--c-muted)" }}>{h.desc}</p>
                </div>
                {i < HOW.length - 1 && (
                  <div className="hidden sm:flex absolute top-7 -right-3 z-10 w-6 h-6 rounded-full items-center justify-center" style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.25)" }}>
                    <Icon name="ChevronRight" size={12} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ RULES ════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="Shield">Правила</SectionBadge>
            <SectionHeading>Кодекс СПАРКОМ</SectionHeading>
            <p className="text-sm max-w-md mx-auto" style={{ color: "var(--c-muted)" }}>
              Простые правила, которые делают встречи комфортными для всех.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {RULES.map((r) => (
              <div key={r.text} className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={glassCard}>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={r.neg
                    ? { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }
                    : { background: "rgba(143,168,154,0.15)", border: "1px solid rgba(143,168,154,0.25)" }
                  }
                >
                  <Icon name={r.icon as "Shield"} size={16} style={{ color: r.neg ? "#f87171" : "var(--c-sage)" } as React.CSSProperties} />
                </div>
                <span className="text-sm" style={{ color: "var(--rule-text)" }}>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
