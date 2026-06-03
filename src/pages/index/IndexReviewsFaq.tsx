import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { ORGANIZER_URL } from "@/lib/constants";
import { REVIEWS, FAQ, glassCard, SectionBadge, SectionHeading, FaqItem } from "./IndexShared";

export default function IndexReviewsFaq() {
  return (
    <>
      {/* ══ REVIEWS ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="MessageCircle">Отзывы</SectionBadge>
            <SectionHeading>Что говорят гости</SectionHeading>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {REVIEWS.map((r) => (
              <div key={r.name} className="rounded-2xl p-6" style={glassCard}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white" style={{ background: "linear-gradient(135deg,#C8834A,#8FA89A)" }}>
                    {r.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: "var(--c-cream)" }}>{r.name}</div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => <Icon key={i} name="Star" size={11} style={{ color: "var(--c-terra)" } as React.CSSProperties} />)}
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>«{r.text}»</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="HelpCircle">Вопросы</SectionBadge>
            <SectionHeading>Часто спрашивают</SectionHeading>
          </div>
          <div className="space-y-3">
            {FAQ.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ══ ORGANIZER CTA ════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden"
            style={{ ...glassCard, boxShadow: "0 8px 48px rgba(0,0,0,0.15)" }}
          >
            <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(200,131,74,0.1), transparent 60%)" }} />
            <div className="relative z-10">
              <SectionBadge icon="Users">Для организаторов</SectionBadge>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ background: "linear-gradient(135deg,#C8834A,#8FA89A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Проведи свою встречу
              </h2>
              <p className="max-w-lg mx-auto mb-8 text-sm" style={{ color: "var(--c-muted)" }}>
                Стань организатором — создавай события и собирай свою аудиторию. Платформа берёт на себя запись, оплату и коммуникацию.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a
                  href={ORGANIZER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-white transition-all hover:brightness-110 hover:scale-105"
                  style={{ background: "linear-gradient(90deg,#C8834A,#8FA89A)", boxShadow: "0 0 32px rgba(200,131,74,0.25)" }}
                >
                  <Icon name="MessageCircle" size={18} />
                  Написать организатору
                </a>
                <Link
                  to="/organizer-cabinet"
                  className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all hover:brightness-110"
                  style={{ background: "var(--cta-btn-idle)", border: "1px solid var(--cta-btn-border)", color: "var(--cta-btn-text)" }}
                >
                  <Icon name="LayoutDashboard" size={18} />
                  Личный кабинет
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
