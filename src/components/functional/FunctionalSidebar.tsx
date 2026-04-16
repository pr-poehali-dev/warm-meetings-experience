import { useState, useEffect } from "react";

const SECTIONS = [
  { id: "s0", title: "Общие сведения о ПО" },
  { id: "s00", title: "Сведения о правообладателе" },
  { id: "s1", title: "Наименование ПО" },
  { id: "s2", title: "Описание функционала" },
  { id: "s21", title: "2.1. Общий функционал" },
  { id: "s22", title: "2.2. Участник" },
  { id: "s23", title: "2.3. Партнёр (Баня)" },
  { id: "s24", title: "2.4. Мастер" },
  { id: "s25", title: "2.5. Организатор" },
  { id: "s26", title: "2.6. Администратор" },
  { id: "s27", title: "2.7. Коммуникация" },
  { id: "s3", title: "Установка и эксплуатация" },
  { id: "s31", title: "3.1. Модель распространения" },
  { id: "s32", title: "3.2. Доступ" },
  { id: "s33", title: "3.3. Системные требования" },
  { id: "s34", title: "3.4. Начало работы" },
  { id: "s35", title: "3.5. Техподдержка" },
];

export default function FunctionalSidebar() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topmost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
          );
          setActiveId(topmost.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Содержание
        </p>
        <nav className="space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() =>
                document
                  .getElementById(s.id)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors leading-snug
                ${
                  activeId === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
            >
              {s.title}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
