import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { EventItem } from "@/data/events";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export const THEME_STYLES = `
  [data-sparcom-theme="dark"] {
    --bg-page:       linear-gradient(160deg, #1a1410 0%, #1c2018 35%, #14201c 65%, #101818 100%);
    --bg-page-solid: #1a1410;
    --orb1: rgba(200,131,74,0.1);
    --orb2: rgba(143,168,154,0.08);
    --orb3: rgba(217,237,232,0.05);
    --c-cream:       #EDE0CC;
    --c-terra:       #C8834A;
    --c-sage:        #8FA89A;
    --c-text:        rgba(217,237,232,0.6);
    --c-muted:       rgba(217,237,232,0.45);
    --c-faint:       rgba(217,237,232,0.3);
    --c-stat-muted:  rgba(217,237,232,0.3);
    --glass-bg:      rgba(237,224,204,0.06);
    --glass-border:  rgba(237,224,204,0.13);
    --filter-active-bg:   white;
    --filter-active-text: #0f0f0f;
    --filter-idle-bg:     rgba(255,255,255,0.1);
    --filter-idle-text:   rgba(255,255,255,0.7);
    --filter-idle-border: rgba(255,255,255,0.1);
    --toggle-bg:     rgba(255,255,255,0.08);
    --toggle-idle:   rgba(255,255,255,0.35);
    --card-meta:     rgba(255,255,255,0.55);
    --card-hover:    rgba(237,224,204,0.09);
    --card-idle:     rgba(237,224,204,0.05);
    --card-border:   rgba(237,224,204,0.22);
    --faq-answer:    rgba(217,237,232,0.6);
    --faq-border:    rgba(237,224,204,0.1);
    --hero-text-from:  #EDE0CC;
    --hero-overlay1: linear-gradient(to bottom, rgba(26,20,16,0.2) 0%, rgba(26,20,16,0.5) 45%, #1a1410 80%);
    --hero-img-opacity: 0.22;
    --cta-btn-idle:  rgba(237,224,204,0.08);
    --cta-btn-text:  #EDE0CC;
    --cta-btn-border: rgba(237,224,204,0.2);
    --rule-text:     rgba(237,224,204,0.75);
    --spotsbar-bg:   rgba(255,255,255,0.12);
    --loading-text:  rgba(217,237,232,0.4);
    --empty-text:    rgba(217,237,232,0.35);
  }

  [data-sparcom-theme="light"] {
    --bg-page:       linear-gradient(160deg, #fdf7f0 0%, #f4f8f5 35%, #eef6f4 65%, #eaf4f2 100%);
    --bg-page-solid: #fdf7f0;
    --orb1: rgba(200,131,74,0.07);
    --orb2: rgba(143,168,154,0.06);
    --orb3: rgba(143,168,154,0.04);
    --c-cream:       #2d2318;
    --c-terra:       #b56b2e;
    --c-sage:        #4a7a6a;
    --c-text:        rgba(35,40,38,0.68);
    --c-muted:       rgba(35,40,38,0.5);
    --c-faint:       rgba(35,40,38,0.35);
    --c-stat-muted:  rgba(35,40,38,0.35);
    --glass-bg:      rgba(255,255,255,0.7);
    --glass-border:  rgba(200,131,74,0.15);
    --filter-active-bg:   #2d2318;
    --filter-active-text: #fff;
    --filter-idle-bg:     rgba(45,35,24,0.06);
    --filter-idle-text:   rgba(45,35,24,0.65);
    --filter-idle-border: rgba(45,35,24,0.12);
    --toggle-bg:     rgba(45,35,24,0.07);
    --toggle-idle:   rgba(45,35,24,0.3);
    --card-meta:     rgba(45,35,24,0.45);
    --card-hover:    rgba(200,131,74,0.07);
    --card-idle:     rgba(255,255,255,0.8);
    --card-border:   rgba(200,131,74,0.35);
    --faq-answer:    rgba(35,40,38,0.6);
    --faq-border:    rgba(200,131,74,0.12);
    --hero-text-from:  #2d2318;
    --hero-overlay1: linear-gradient(to bottom, rgba(253,247,240,0.1) 0%, rgba(253,247,240,0.45) 45%, #fdf7f0 80%);
    --hero-img-opacity: 0.18;
    --cta-btn-idle:  rgba(45,35,24,0.06);
    --cta-btn-text:  #2d2318;
    --cta-btn-border: rgba(45,35,24,0.18);
    --rule-text:     rgba(45,35,24,0.75);
    --spotsbar-bg:   rgba(45,35,24,0.1);
    --loading-text:  rgba(35,40,38,0.4);
    --empty-text:    rgba(35,40,38,0.35);
  }
`;

export const FORMATS = [
  { icon: "Flame", title: "Банные вечера", desc: "Пар, общение, расслабление — форматы для новичков и завсегдатаев бани." },
  { icon: "Users", title: "Знакомства", desc: "Встречи для тех, кто ищет тёплое общение и новые связи." },
  { icon: "Sparkles", title: "Практики", desc: "Дыхание, медитация, звук — практики для тела и духа в банном пространстве." },
  { icon: "Briefcase", title: "Нетворкинг", desc: "Деловые встречи предпринимателей в неформальной, расслабленной обстановке." },
];

export const HOW = [
  { n: "01", icon: "CalendarDays", title: "Выберите встречу", desc: "Посмотрите афишу и выберите формат и дату." },
  { n: "02", icon: "MousePointerClick", title: "Запишитесь", desc: "Одно нажатие — и вы в списке. Без лишних форм." },
  { n: "03", icon: "Waves", title: "Приходите и отдыхайте", desc: "Баня, пар, люди. Всё остальное мы берём на себя." },
];

export const RULES = [
  { icon: "Wine", neg: true, text: "Алкоголь запрещён" },
  { icon: "Shield", neg: false, text: "Уважение к пространству и людям" },
  { icon: "Clock", neg: false, text: "Приходите вовремя" },
  { icon: "Volume2", neg: true, text: "Без громкого шума и агрессии" },
  { icon: "UserCheck", neg: false, text: "Следуйте правилам организатора" },
  { icon: "HeartHandshake", neg: false, text: "Открытость к новым знакомствам" },
];

export const FAQ = [
  { q: "Нужно ли уметь париться?", a: "Нет. Многие форматы не предполагают хлестание вениками — это просто тёплое пространство для общения." },
  { q: "Что взять с собой?", a: "Полотенце, купальник/плавки, смену белья. На месте обычно есть всё остальное." },
  { q: "Можно прийти одному?", a: "Да, большинство гостей приходят именно так. Это часть формата — познакомиться с новыми людьми." },
  { q: "Как отменить запись?", a: "Через личный кабинет или напрямую организатору. Условия указаны на странице события." },
  { q: "Есть ли возрастное ограничение?", a: "Мероприятия для взрослых 18+. На некоторые семейные встречи дети допускаются — это указано в описании." },
];

export const REVIEWS = [
  { name: "Мария К.", text: "Была на женском детоксе — просто восторг. Тепло, уютно, и такие приятные люди вокруг!", avatar: "МК" },
  { name: "Алексей С.", text: "Бизнес-баня — формат, которого мне не хватало. Разговоры получаются иначе, чем в офисе.", avatar: "АС" },
  { name: "Елена В.", text: "Пришла одна, ушла с новыми знакомыми. Организация на высоте, всё продумано.", avatar: "ЕВ" },
];

export const glassCard: React.CSSProperties = {
  background: "var(--glass-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(20px)",
};

export function SectionBadge({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
      style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.3)", color: "var(--c-terra)" }}
    >
      <Icon name={icon as "Flame"} size={13} />
      {children}
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3" style={{ color: "var(--c-cream)" }}>
      {children}
    </h2>
  );
}

export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:brightness-105"
      style={glassCard}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between px-5 py-4 gap-3">
        <span className="font-medium text-sm" style={{ color: "var(--c-cream)" }}>{q}</span>
        <Icon
          name="ChevronDown"
          size={16}
          className={`flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--c-terra)" } as React.CSSProperties}
        />
      </div>
      {open && (
        <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "var(--faq-answer)", borderTop: "1px solid var(--faq-border)" }}>
          <div className="pt-3">{a}</div>
        </div>
      )}
    </div>
  );
}

export function spotsInfo(left: number, total: number) {
  if (left === 0) return { text: "Мест нет", cls: "text-red-400" };
  if (left <= 2) return { text: `Осталось ${left}`, cls: "text-orange-400" };
  return { text: `${left} из ${total}`, cls: "text-emerald-400" };
}

export function SpotsBar({ left, total }: { left: number; total: number }) {
  const pct = total > 0 ? Math.round(((total - left) / total) * 100) : 100;
  const color = left === 0 ? "bg-red-400" : left <= 2 ? "bg-orange-400" : "bg-emerald-400";
  return (
    <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "var(--spotsbar-bg)" }}>
      <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function NetflixGridCard({ event }: { event: EventItem }) {
  const [hovered, setHovered] = useState(false);
  const dateObj = parseISO(event.date);
  const dayNum = format(dateObj, "d");
  const monthShort = format(dateObj, "LLL", { locale: ru });
  const weekday = format(dateObj, "EEEEEE", { locale: ru });
  const sp = spotsInfo(event.spotsLeft, event.totalSpots);
  const sold = event.spotsLeft === 0;

  return (
    <Link
      to={`/events/${event.slug}`}
      className="group relative block rounded-2xl overflow-hidden cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-52 sm:h-56">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg,rgba(200,131,74,0.35),rgba(143,168,154,0.2))" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        <div
          className="absolute top-3 left-3 flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl min-w-[52px]"
          style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        >
          <div className="text-[10px] uppercase font-semibold leading-none tracking-wide" style={{ color: "var(--c-terra)" }}>
            {monthShort}
          </div>
          <div className="text-xl font-extrabold leading-none mt-0.5 text-white">{dayNum}</div>
          <div className="text-[9px] uppercase leading-none mt-0.5 text-white/60">{weekday}</div>
        </div>

        {event.featured && (
          <div className="absolute top-3 left-[72px] bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">ТОП</div>
        )}
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--c-terra)", color: "#fff" }}>{event.type}</span>
        </div>

        {event.timeStart && (
          <div
            className="absolute top-12 right-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", color: "#fff" }}
          >
            <Icon name="Clock" size={10} />
            {event.timeStart}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center justify-end text-xs mb-1">
            <span className={`font-semibold ${sp.cls}`}>{sp.text}</span>
          </div>
          <p className="font-semibold text-sm leading-snug mb-1 line-clamp-2 text-white">{event.title}</p>
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs flex items-center gap-1">
              <Icon name="MapPin" size={11} />{event.bathName ?? "—"}
            </span>
            <span className="font-bold text-sm" style={{ color: "#FF6B1A" }}>{event.priceLabel}</span>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-200 rounded-2xl"
        style={{ background: "rgba(0,0,0,0.7)", opacity: hovered ? 1 : 0 }}
      >
        <span className="text-white font-bold rounded-full px-6 py-2 text-sm" style={{ background: sold ? "rgba(255,255,255,0.15)" : "linear-gradient(90deg,var(--c-terra),var(--c-sage))" }}>
          {sold ? "Мест нет" : "Окунуться →"}
        </span>
        {event.priceLabel && !sold && (
          <span className="font-bold text-lg" style={{ color: "#FF6B1A" }}>{event.priceLabel}</span>
        )}
      </div>

      <div className="px-0 pt-0">
        <SpotsBar left={event.spotsLeft} total={event.totalSpots} />
      </div>
    </Link>
  );
}

export function NetflixListCard({ event }: { event: EventItem }) {
  const [hovered, setHovered] = useState(false);
  const dateObj = parseISO(event.date);
  const dateStr = format(dateObj, "d MMMM, EEEE", { locale: ru });
  const sp = spotsInfo(event.spotsLeft, event.totalSpots);
  const sold = event.spotsLeft === 0;

  return (
    <Link
      to={`/events/${event.slug}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex gap-4 rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          background: hovered ? "var(--card-hover)" : "var(--card-idle)",
          border: "1px solid var(--card-border)",
          transform: hovered ? "translateX(4px)" : "translateX(0)",
          boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.15)" : "none",
        }}
      >
        <div className="relative flex-shrink-0 w-32 sm:w-40 h-24 sm:h-28 overflow-hidden">
          {event.image ? (
            <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <div className="w-full h-full" style={{ background: "linear-gradient(135deg,rgba(200,131,74,0.3),rgba(143,168,154,0.15))" }} />
          )}
          {event.featured && (
            <div className="absolute top-2 left-2 bg-yellow-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">ТОП</div>
          )}
        </div>

        <div className="flex-1 min-w-0 py-3 pr-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(200,131,74,0.2)", color: "var(--c-terra)" }}>{event.type}</span>
              <span className={`text-xs font-medium ${sp.cls}`}>{sp.text}</span>
            </div>
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-1" style={{ color: "var(--c-cream)" }}>{event.title}</h3>
            <div className="flex flex-wrap gap-x-3 text-xs" style={{ color: "var(--card-meta)" }}>
              <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{dateStr}</span>
              <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{event.timeStart}</span>
              {event.bathName && <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{event.bathName}</span>}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-sm" style={{ color: "#FF6B1A" }}>{event.priceLabel}</span>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full transition-all duration-200"
              style={hovered && !sold
                ? { background: "linear-gradient(90deg,var(--c-terra),var(--c-sage))", color: "#fff" }
                : { background: "var(--toggle-bg)", color: "var(--toggle-idle)" }
              }
            >
              {sold ? "Занято" : "Окунуться →"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}