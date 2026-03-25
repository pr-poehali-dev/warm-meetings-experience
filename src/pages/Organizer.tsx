import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import Footer from "@/components/Footer";
import func2url from "../../backend/func2url.json";

const BENEFITS = [
  { icon: "Users", title: "Готовая аудитория", desc: "Более 500 участников уже ищут новые события. Твоя афиша попадёт в ленту активных и заинтересованных людей." },
  { icon: "CalendarCheck", title: "Удобная система бронирования", desc: "Участники записываются онлайн, ты видишь список и управляешь записью из личного кабинета." },
  { icon: "CreditCard", title: "Приём оплат онлайн", desc: "Безопасные платежи, автоматические чеки. Деньги приходят после проведения события." },
  { icon: "Bell", title: "Автоматические уведомления", desc: "Участники получают напоминания о событии. Меньше неявок, больше стабильности." },
  { icon: "BarChart3", title: "Статистика и аналитика", desc: "Видишь, сколько людей смотрят событие, записываются и возвращаются снова." },
  { icon: "FileCheck", title: "Юридическая поддержка", desc: "Поможем с договорами, чеками и налогами. Работай спокойно и легально." },
];

const STEPS = [
  { num: "01", title: "Заявка", desc: "Заполни простую форму — мы свяжемся в течение дня" },
  { num: "02", title: "Создание", desc: "Поможем создать карточку события и настроить всё под твой формат" },
  { num: "03", title: "Публикация", desc: "Событие появляется в афише и становится доступно для записи" },
  { num: "04", title: "Проведение", desc: "Ты проводишь событие, мы собираем обратную связь и переводим оплату" },
];

const TARIFFS = [
  { name: "Базовый", commission: "15%", badge: "Для всех", features: ["Размещение в ленте", "Профиль организатора", "Онлайн-запись участников", "Базовая поддержка"], highlighted: false },
  { name: "Партнёрский", commission: "10%", badge: "3+ событий / мес", features: ["Размещение в ленте", "Профиль организатора", "Помощь в продвижении", "Приоритетная поддержка"], highlighted: true },
];

const FAQ = [
  { q: "Сколько стоит размещение?", a: "Размещение событий бесплатно. Мы берём комиссию 10–15% с каждого проданного билета — только если событие состоялось и собрало участников." },
  { q: "Нужно ли быть ИП или самозанятым?", a: "Желательно. Мы помогаем с оформлением, но если ты пока не готов — можем обсудить индивидуальные условия." },
  { q: "Как быстро событие появится в афише?", a: "После модерации — в течение 24 часов. В высокий сезон может быть чуть дольше, но мы предупреждаем." },
  { q: "Что если событие не наберёт участников?", a: "Ты сам решаешь минимальный порог. Если он не набран — событие отменяется без последствий. Никаких штрафов." },
  { q: "Можно ли проводить события в своей бане?", a: "Да. Если у тебя есть своя баня — отлично. Если нет — поможем подобрать площадку из наших партнёров." },
  { q: "Какие форматы событий подходят?", a: "Банные встречи, мастер-классы по парению, чайные церемонии, восстановительные практики — любой формат, связанный с баней и здоровьем." },
];

const CHECKLIST = [
  "Идея события (формат, тема, программа)",
  "Баня-партнёр (поможем подобрать, если нет своей)",
  "Желание делиться теплом и собирать людей",
];

const CITIES = ["Москва", "Санкт-Петербург", "Другой город"];

export default function Organizer() {
  const formRef = useRef<HTMLDivElement>(null);
  const [ticketPrice, setTicketPrice] = useState(2000);
  const [participants, setParticipants] = useState(10);
  const [commission, setCommission] = useState(15);

  const [form, setForm] = useState({ name: "", telegram: "", email: "", city: "Москва", has_own_bath: "no", event_format: "", additional_info: "" });
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
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
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
      <div className="fixed top-4 left-4 z-50">
        <Link to="/" className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full hover:bg-white/20 transition-colors text-sm font-medium">
          <Icon name="ArrowLeft" size={16} />
          <span className="hidden sm:inline">Главная</span>
        </Link>
      </div>

      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/85" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center py-32">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">Проводи события вместе со{"\u00A0"}СПАРКОМом</h1>
          <p className="text-xl md:text-2xl text-white/80 mb-10 font-light max-w-2xl mx-auto leading-relaxed">
            Платформа, которая помогает организовать банные встречи, находить участников и развивать своё дело
          </p>
          <Button size="lg" className="rounded-full text-lg px-10 py-6 bg-white text-foreground hover:bg-white/90" onClick={scrollToForm}>
            Заполнить заявку
          </Button>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">{counters.events}+</div>
              <div className="text-sm text-muted-foreground">Проведено событий</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">{counters.visitors.toLocaleString("ru-RU")}+</div>
              <div className="text-sm text-muted-foreground">Участников посетило</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">{counters.organizers}</div>
              <div className="text-sm text-muted-foreground">Организаторов</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">Почему организаторы выбирают СПАРКОМ</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {BENEFITS.map((b, i) => (
              <Card key={i} className="p-8 bg-card border-0 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-5">
                  <Icon name={b.icon} className="text-accent" size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">Как это работает</h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              {STEPS.map((s, i) => (
                <div key={i} className="text-center relative">
                  <div className="text-5xl font-bold text-accent/15 mb-4">{s.num}</div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
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

      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-center">Тарифы</h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">Размещение бесплатно — комиссия только с проданных билетов</p>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {TARIFFS.map((t, i) => (
              <Card key={i} className={`p-8 border-0 shadow-sm ${t.highlighted ? "ring-2 ring-accent relative" : ""}`}>
                {t.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Выгоднее
                  </div>
                )}
                <div className="text-center mb-6">
                  <div className="text-sm text-muted-foreground mb-1">{t.badge}</div>
                  <div className="text-lg font-semibold mb-1">{t.name}</div>
                  <div className="text-4xl font-bold">{t.commission}</div>
                  <div className="text-sm text-muted-foreground">комиссия</div>
                </div>
                <ul className="space-y-3">
                  {t.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <Icon name="Check" size={16} className="text-green-600 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-center">Калькулятор дохода</h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">Посчитай, сколько ты можешь заработать</p>
          <Card className="max-w-xl mx-auto p-8 border-0 shadow-sm">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Стоимость участия: {ticketPrice.toLocaleString("ru-RU")} ₽</label>
                <input type="range" min={500} max={10000} step={100} value={ticketPrice} onChange={(e) => setTicketPrice(+e.target.value)} className="w-full accent-foreground" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>500 ₽</span><span>10 000 ₽</span></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Участников: {participants}</label>
                <input type="range" min={2} max={50} step={1} value={participants} onChange={(e) => setParticipants(+e.target.value)} className="w-full accent-foreground" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>2</span><span>50</span></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Тариф</label>
                <div className="flex gap-3">
                  <Button variant={commission === 15 ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setCommission(15)}>Базовый 15%</Button>
                  <Button variant={commission === 10 ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setCommission(10)}>Партнёрский 10%</Button>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Ваш доход с одного события</div>
                  <div className="text-4xl font-bold">{income.toLocaleString("ru-RU")} ₽</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-12 text-center">Что нужно для старта</h2>
          <div className="max-w-lg mx-auto">
            <div className="space-y-4">
              {CHECKLIST.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-5 bg-card rounded-lg">
                  <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="Check" size={16} className="text-green-600" />
                  </div>
                  <span className="text-sm leading-relaxed pt-1">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">Частые вопросы</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {FAQ.map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-muted/30" ref={formRef}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-center">Готов провести своё событие?</h2>
            <p className="text-center text-muted-foreground mb-10">Заполни заявку — мы свяжемся в течение 24 часов</p>

            {sent ? (
              <Card className="p-10 border-0 shadow-sm">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="Check" size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Заявка отправлена, аккаунт создан!</h3>
                  <p className="text-muted-foreground">Мы свяжемся с вами в течение 24 часов. А пока — сохраните данные для входа.</p>
                </div>
                {accountData && (
                  <div className="bg-muted/50 rounded-xl p-6 space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="font-medium">{accountData.email}</span>
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Пароль</span>
                      <span className="font-mono font-medium bg-white px-3 py-1 rounded-lg border">{accountData.password}</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-center mb-6">Данные для входа также отправлены на вашу почту</p>
                <div className="flex gap-3">
                  <Button asChild className="flex-1 rounded-full" size="lg">
                    <Link to="/login">Войти в кабинет</Link>
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-8 border-0 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Имя *</label>
                    <Input placeholder="Как к вам обращаться" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Telegram / WhatsApp *</label>
                    <Input placeholder="@username или номер" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email *</label>
                    <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Город</label>
                    <div className="flex gap-2 flex-wrap">
                      {CITIES.map((c) => (
                        <Button key={c} type="button" variant={form.city === c ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, city: c })}>
                          {c}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Есть своя баня?</label>
                    <div className="flex gap-2">
                      {[["yes", "Да"], ["no", "Нет"], ["in_progress", "В процессе"]].map(([val, label]) => (
                        <Button key={val} type="button" variant={form.has_own_bath === val ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, has_own_bath: val })} className="flex-1">
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Формат события *</label>
                    <Textarea placeholder="Опишите, какие события вы хотите проводить" rows={3} value={form.event_format} onChange={(e) => setForm({ ...form, event_format: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Дополнительная информация</label>
                    <Textarea placeholder="Что ещё хотите рассказать" rows={2} value={form.additional_info} onChange={(e) => setForm({ ...form, additional_info: e.target.value })} />
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" required className="mt-1 accent-primary" />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Я даю согласие на обработку{" "}
                      <Link to="/privacy" target="_blank" className="underline hover:text-foreground">персональных данных</Link>{" "}
                      в соответствии с политикой конфиденциальности
                    </span>
                  </label>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" size="lg" className="w-full rounded-full" disabled={sending}>
                    {sending ? "Отправка..." : "Отправить заявку"}
                  </Button>
                </form>
              </Card>
            )}

            <div className="mt-6 text-center">
              <a href="mailto:club@sparcom.ru" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Или напишите нам — club@sparcom.ru
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <button className="w-full p-6 text-left flex items-start justify-between gap-4" onClick={() => setOpen(!open)}>
        <span className="font-semibold text-base">{question}</span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={20} className="text-muted-foreground flex-shrink-0 mt-0.5" />
      </button>
      {open && (
        <div className="px-6 pb-6 -mt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
        </div>
      )}
    </Card>
  );
}