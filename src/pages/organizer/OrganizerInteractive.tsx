import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { FAQ } from "./organizerData";
import { FaqItem } from "./OrganizerSections";
import func2url from "../../../backend/func2url.json";

// ── Income Calculator ─────────────────────────────────────────────────────────
export function OrganizerCalculator() {
  const [ticketPrice, setTicketPrice] = useState(2500);
  const [participants, setParticipants] = useState(12);
  const [commission, setCommission] = useState(15);

  const income = Math.round(ticketPrice * participants * (1 - commission / 100));

  return (
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
  );
}

// ── FAQ Section ───────────────────────────────────────────────────────────────
export function OrganizerFAQ() {
  return (
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
  );
}

// ── Application Form ──────────────────────────────────────────────────────────
interface ApplicationFormProps {
  formRef: React.RefObject<HTMLDivElement>;
}

export function OrganizerApplicationForm({ formRef }: ApplicationFormProps) {
  const [form, setForm] = useState({ name: "", telegram: "", email: "", has_own_bath: "no", event_format: "", additional_info: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [accountData, setAccountData] = useState<{ email: string; password: string; token: string } | null>(null);

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

  return (
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
  );
}
