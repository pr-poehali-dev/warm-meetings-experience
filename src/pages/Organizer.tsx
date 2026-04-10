import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import Footer from "@/components/Footer";
import func2url from "../../backend/func2url.json";

// ── данные ────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    icon: "LayoutDashboard",
    title: "Личный кабинет организатора",
    desc: "Дашборд с ближайшими событиями, статистикой участников и доходом. Всё управление — в одном месте.",
    tag: "Управление",
  },
  {
    icon: "PenLine",
    title: "Редактор событий",
    desc: "Создавай и редактируй встречи прямо на странице: название, программа, правила, стоимость — всё меняется в один клик.",
    tag: "Редактор",
  },
  {
    icon: "Users",
    title: "Список участников",
    desc: "Видишь кто записался, кто оплатил и кто пришёл. Ручное добавление, экспорт в CSV, управление статусами.",
    tag: "Участники",
  },
  {
    icon: "Layers",
    title: "Динамическое ценообразование",
    desc: "Настраивай волны цен: «раннее бронирование», «стандарт», «у ворот» — каждая с датой окончания.",
    tag: "Цены",
  },
  {
    icon: "Send",
    title: "Публикация в Telegram",
    desc: "Подключи свой канал и публикуй события одной кнопкой. Настрой шаблон поста под свой стиль.",
    tag: "Telegram",
  },
  {
    icon: "UserPlus",
    title: "Соорганизаторы",
    desc: "Добавляй помощников к событию по ссылке или email. Они получают доступ к редактированию и участникам.",
    tag: "Команда",
  },
];

const STEPS = [
  { num: "01", title: "Заявка", desc: "Заполни форму — мы свяжемся в течение 24 часов и создадим аккаунт" },
  { num: "02", title: "Создай событие", desc: "В личном кабинете оформи первую встречу — редактор поможет на каждом шаге" },
  { num: "03", title: "Публикация", desc: "После модерации встреча появляется в афише и становится доступна для записи" },
  { num: "04", title: "Встреча и оплата", desc: "Проведи встречу, собери участников — оплата переводится после события" },
];

const TARIFFS = [
  {
    name: "Базовый",
    commission: "15%",
    badge: "Для всех",
    features: [
      "Размещение в афише",
      "Профиль организатора",
      "Онлайн-запись участников",
      "Кабинет + редактор событий",
      "Базовая поддержка",
    ],
    highlighted: false,
  },
  {
    name: "Партнёрский",
    commission: "10%",
    badge: "3+ встреч в месяц",
    features: [
      "Размещение в афише",
      "Профиль организатора",
      "Приоритет в ленте и поиске",
      "Помощь в продвижении",
      "Приоритетная поддержка",
    ],
    highlighted: true,
  },
];

const FAQ = [
  { q: "Сколько стоит размещение?", a: "Размещение встреч бесплатно. Комиссия 10–15% берётся только с проданных билетов — и только если встреча состоялась." },
  { q: "Нужно ли быть ИП или самозанятым?", a: "Желательно. Мы помогаем с оформлением, но если ты пока не готов — можем обсудить индивидуальные условия." },
  { q: "Как быстро встреча появится в афише?", a: "После модерации — в течение 24 часов. В высокий сезон может быть чуть дольше, но мы предупреждаем заранее." },
  { q: "Что если встреча не наберёт участников?", a: "Ты сам устанавливаешь минимальный порог. Если он не набран — встреча отменяется без штрафов." },
  { q: "Можно проводить встречи в своей бане?", a: "Да. Если у тебя есть своя баня — отлично. Если нет — поможем подобрать площадку из наших партнёров." },
  { q: "Как работает Telegram-интеграция?", a: "Подключаешь свой Telegram-канал в кабинете организатора и публикуешь анонс события одной кнопкой. Поддерживается настройка шаблона поста." },
];

// ── компонент ─────────────────────────────────────────────────────────────────

export default function Organizer() {
  const formRef = useRef<HTMLDivElement>(null);
  const [ticketPrice, setTicketPrice] = useState(2500);
  const [participants, setParticipants] = useState(12);
  const [commission, setCommission] = useState(15);

  const [form, setForm] = useState({ name: "", telegram: "", email: "", has_own_bath: "no", event_format: "", additional_info: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [accountData, setAccountData] = useState<{ email: string; password: string; token: string } | null>(null);

  const income = Math.round(ticketPrice * participants * (1 - commission / 100));

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.telegram.trim() || !form.email.trim()) {
      setError("Заполните обязательные поля");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(func2url["organizer-request"], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка отправки");
      setAccountData({ email: data.user?.email || form.email, password: data.generated_password || "", token: data.token || "" });
      if (data.token) localStorage.setItem("token", data.token);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить заявку");
    } finally {
      setSending(false);
    }
  };

  const [counters, setCounters] = useState({ events: 0, visitors: 0, organizers: 0 });
  useEffect(() => {
    const targets = { events: 120, visitors: 3500, organizers: 24 };
    const duration = 1500;
    const steps = 40;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounters({
        events: Math.round(targets.events * eased),
        visitors: Math.round(targets.visitors * eased),
        organizers: Math.round(targets.organizers * eased),
      });
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header transparent />

      {/* ── hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/80" />
        {/* декоративная сетка */}
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
            <Button size="lg" className="rounded-full text-base px-8 py-6 bg-white text-foreground hover:bg-white/90" onClick={scrollToForm}>
              Стать организатором
            </Button>
            <Button size="lg" variant="outline" className="rounded-full text-base px-8 py-6 border-white/30 text-white hover:bg-white/10" asChild>
              <Link to="/organizer-cabinet">Войти в кабинет</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── счётчики ─────────────────────────────────────────────────────────── */}
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

      {/* ── инструменты кабинета ─────────────────────────────────────────────── */}
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

      {/* ── скриншот-блок: кабинет ───────────────────────────────────────────── */}
      <section className="py-16 bg-muted/40 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
            {/* текст */}
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
              <Button className="mt-8 rounded-full" onClick={scrollToForm}>
                Получить доступ
              </Button>
            </div>
            {/* мок-скриншот */}
            <div className="flex-1 w-full">
              <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
                {/* header мока */}
                <div className="bg-muted/60 px-4 py-3 flex items-center gap-2 border-b border-border">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">sparcom.ru/organizer-cabinet</span>
                </div>
                {/* body мока */}
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

      {/* ── как это работает ─────────────────────────────────────────────────── */}
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

      {/* ── тарифы ───────────────────────────────────────────────────────────── */}
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
                <Button className="w-full mt-8 rounded-full" variant={t.highlighted ? "default" : "outline"} onClick={scrollToForm}>
                  Начать
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── калькулятор дохода ───────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-center">Калькулятор дохода</h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">Посчитай, сколько можно заработать с одной встречи</p>
          <Card className="max-w-xl mx-auto p-8 border-0 shadow-sm">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Стоимость участия: <span className="text-primary">{ticketPrice.toLocaleString("ru-RU")} ₽</span></label>
                <input type="range" min={500} max={10000} step={100} value={ticketPrice} onChange={(e) => setTicketPrice(+e.target.value)} className="w-full accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>500 ₽</span><span>10 000 ₽</span></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Участников: <span className="text-primary">{participants}</span></label>
                <input type="range" min={2} max={50} step={1} value={participants} onChange={(e) => setParticipants(+e.target.value)} className="w-full accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>2</span><span>50</span></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Тариф</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCommission(15)}
                    className={`rounded-xl border py-3 px-4 text-sm font-medium transition-all ${commission === 15 ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-border/80"}`}
                  >
                    Базовый · 15%
                  </button>
                  <button
                    onClick={() => setCommission(10)}
                    className={`rounded-xl border py-3 px-4 text-sm font-medium transition-all ${commission === 10 ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-border/80"}`}
                  >
                    Партнёрский · 10%
                  </button>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">Ваш доход с одного события</div>
                  <div className="text-5xl font-bold text-primary">{income.toLocaleString("ru-RU")} ₽</div>
                  <div className="text-xs text-muted-foreground mt-2">= {ticketPrice.toLocaleString()} ₽ × {participants} чел. − {commission}% комиссии</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">Частые вопросы</h2>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ.map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── форма заявки ─────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28" ref={formRef}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-semibold mb-3">Готов провести своё событие?</h2>
              <p className="text-muted-foreground text-lg">Заполни заявку — мы свяжемся в течение 24 часов и откроем доступ к кабинету</p>
            </div>

            {sent ? (
              <Card className="p-10 border-0 shadow-sm">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="Check" size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Заявка принята, аккаунт создан!</h3>
                  <p className="text-muted-foreground text-sm">Мы свяжемся с вами в течение 24 часов. Сохраните данные для входа:</p>
                </div>
                {accountData && (
                  <div className="bg-muted/50 rounded-xl p-5 space-y-3 mb-6 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{accountData.email}</span>
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Пароль</span>
                      <span className="font-mono font-medium bg-white px-3 py-1 rounded-lg border text-sm">{accountData.password}</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-center mb-6">Данные для входа также отправлены на вашу почту</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild className="flex-1 rounded-full" size="lg">
                    <Link to="/organizer-cabinet">Открыть кабинет</Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1 rounded-full" size="lg">
                    <Link to="/login">Войти</Link>
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-8 border-0 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Имя *</label>
                    <Input placeholder="Как к вам обращаться" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Telegram *</label>
                    <Input placeholder="@username" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email *</label>
                    <Input type="email" placeholder="для входа в кабинет" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Есть своя баня?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[["yes", "Да, есть"], ["no", "Нет, нужна площадка"]].map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setForm({ ...form, has_own_bath: val })}
                          className={`rounded-xl border py-2.5 px-4 text-sm font-medium transition-all ${form.has_own_bath === val ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-border/80"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Формат встречи</label>
                    <Input placeholder="Мужской пар, смешанная, мастер-класс..." value={form.event_format} onChange={(e) => setForm({ ...form, event_format: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Расскажи о себе</label>
                    <Textarea
                      placeholder="Опыт парения, как долго проводишь встречи, ваши идеи..."
                      rows={3}
                      value={form.additional_info}
                      onChange={(e) => setForm({ ...form, additional_info: e.target.value })}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full rounded-full h-12 text-base" disabled={sending}>
                    {sending ? (
                      <><Icon name="Loader2" size={18} className="animate-spin mr-2" />Отправляем...</>
                    ) : "Отправить заявку"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Нажимая кнопку, вы соглашаетесь с{" "}
                    <Link to="/documents?tab=privacy" className="underline hover:text-foreground">политикой конфиденциальности</Link>
                  </p>
                </form>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* ── финальный CTA ────────────────────────────────────────────────────── */}
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

      <Footer />
    </div>
  );
}

// ── FAQ аккордеон ─────────────────────────────────────────────────────────────
function FaqItem({ question, answer }: { question: string; answer: string }) {
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
