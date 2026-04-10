import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { TOOLS, STEPS, TARIFFS } from "./organizerData";

// ── Hero ──────────────────────────────────────────────────────────────────────
export function OrganizerHero({ onScrollToForm }: { onScrollToForm: () => void }) {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/80" />
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
        backgroundSize: "48px 48px"
      }} />
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center py-36">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white/80 text-sm mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Принимаем новых организаторов
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Проводи банные встречи.<br className="hidden md:block" /> Зарабатывай на своём деле.
        </h1>
        <p className="text-xl md:text-2xl text-white/70 mb-10 font-light max-w-2xl mx-auto leading-relaxed">
          Платформа со всем нужным: афиша, кабинет, онлайн-запись, оплаты и Telegram-канал — в одном месте
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="rounded-full text-base px-8 py-6 bg-white text-foreground hover:bg-white/90" onClick={onScrollToForm}>
            Стать организатором
          </Button>
          <Button size="lg" variant="outline" className="rounded-full text-base px-8 py-6 border-white/30 text-white hover:bg-white/10" asChild>
            <Link to="/organizer-cabinet">Войти в кабинет</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ── Counters ──────────────────────────────────────────────────────────────────
export function OrganizerCounters({ counters }: { counters: { events: number; visitors: number; organizers: number } }) {
  return (
    <section className="py-16 border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
          <div>
            <div className="text-4xl md:text-5xl font-bold mb-1">{counters.events}+</div>
            <div className="text-sm text-muted-foreground">встреч проведено</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-bold mb-1">{counters.visitors.toLocaleString("ru-RU")}+</div>
            <div className="text-sm text-muted-foreground">участников посетило</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-bold mb-1">{counters.organizers}</div>
            <div className="text-sm text-muted-foreground">организатора</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Tools ─────────────────────────────────────────────────────────────────────
export function OrganizerTools() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">Всё что нужно — уже внутри</h2>
          <p className="text-lg text-muted-foreground">В личном кабинете организатора есть готовые инструменты для каждого этапа работы</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {TOOLS.map((t, i) => (
            <Card key={i} className="p-6 bg-card border border-border/60 hover:border-border hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Icon name={t.icon as "Users"} size={20} className="text-primary" />
                </div>
                <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t.tag}</span>
              </div>
              <h3 className="text-base font-semibold mb-2">{t.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Cabinet Preview ───────────────────────────────────────────────────────────
export function OrganizerCabinetPreview({ onScrollToForm }: { onScrollToForm: () => void }) {
  return (
    <section className="py-16 bg-muted/40 border-y border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1 mb-4">
              <Icon name="Sparkles" size={12} />
              Кабинет организатора
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 leading-snug">
              Управляй встречами<br />как настоящий профи
            </h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                "Дашборд с ближайшими событиями и доходом",
                "Inline-редактор: меняй текст прямо на карточке",
                "Список участников с фильтрами и статусами",
                "Экспорт в CSV и ручное добавление гостей",
                "Публикация в Telegram одной кнопкой",
                "Соорганизаторы — работай с командой",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Icon name="Check" size={15} className="text-green-600 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="mt-8 rounded-full" onClick={onScrollToForm}>
              Получить доступ
            </Button>
          </div>
          <div className="flex-1 w-full">
            <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
              <div className="bg-muted/60 px-4 py-3 flex items-center gap-2 border-b border-border">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">sparcom.ru/organizer-cabinet</span>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[["8", "Событий"], ["96", "Участников"], ["47 200 ₽", "Доход"]].map(([val, label], i) => (
                    <div key={i} className="bg-muted/50 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold">{val}</div>
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    { title: "Мужской пар · 15 апр", spots: "8/12", color: "bg-[#C0674B]" },
                    { title: "Женская церемония · 18 апр", spots: "5/10", color: "bg-[#E8A2A2]" },
                    { title: "Смешанная встреча · 22 апр", spots: "2/15", color: "bg-[#5B8C5A]" },
                  ].map((ev, i) => (
                    <div key={i} className="flex items-center gap-2.5 bg-muted/40 rounded-lg px-3 py-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${ev.color}`} />
                      <span className="text-xs font-medium flex-1 truncate">{ev.title}</span>
                      <span className="text-[10px] text-muted-foreground">{ev.spots}</span>
                      <Icon name="ChevronRight" size={12} className="text-muted-foreground" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <div className="flex-1 bg-primary/10 rounded-lg px-3 py-2 text-xs text-primary font-medium text-center">+ Создать событие</div>
                  <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-xs text-muted-foreground text-center">Все события</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
export function OrganizerHowItWorks() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">Как это работает</h2>
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center relative">
                <div className="text-5xl font-bold text-accent/15 mb-4">{s.num}</div>
                <h3 className="text-base font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 -right-4 text-muted-foreground/20">
                    <Icon name="ChevronRight" size={24} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Tariffs ───────────────────────────────────────────────────────────────────
export function OrganizerTariffs({ onScrollToForm }: { onScrollToForm: () => void }) {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-center">Тарифы</h2>
        <p className="text-center text-muted-foreground mb-16 text-lg">Размещение бесплатно — комиссия только с проданных билетов</p>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {TARIFFS.map((t, i) => (
            <Card key={i} className={`p-8 border-0 shadow-sm relative ${t.highlighted ? "ring-2 ring-primary" : ""}`}>
              {t.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Выгоднее
                </div>
              )}
              <div className="text-center mb-6">
                <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">{t.badge}</div>
                <div className="text-lg font-semibold mb-2">{t.name}</div>
                <div className="text-5xl font-bold">{t.commission}</div>
                <div className="text-sm text-muted-foreground mt-1">комиссия с билета</div>
              </div>
              <ul className="space-y-3">
                {t.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <Icon name="Check" size={15} className="text-green-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-8 rounded-full" variant={t.highlighted ? "default" : "outline"} onClick={onScrollToForm}>
                Начать
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
export function OrganizerFinalCTA() {
  return (
    <section className="py-16 bg-foreground text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold mb-3">Уже организатор?</h2>
        <p className="text-white/70 mb-6">Войдите в кабинет и управляйте своими встречами</p>
        <Button asChild size="lg" className="rounded-full bg-white text-foreground hover:bg-white/90 px-8">
          <Link to="/organizer-cabinet">
            <Icon name="LayoutDashboard" size={18} className="mr-2" />
            Открыть кабинет
          </Link>
        </Button>
      </div>
    </section>
  );
}

// ── FAQ Item ──────────────────────────────────────────────────────────────────
export function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-all ${open ? "border-border" : "border-border/60"}`}>
      <button className="w-full p-5 text-left flex items-start justify-between gap-4" onClick={() => setOpen(!open)}>
        <span className="font-medium text-base leading-snug">{question}</span>
        <Icon
          name="ChevronDown"
          size={18}
          className={`text-muted-foreground shrink-0 mt-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
