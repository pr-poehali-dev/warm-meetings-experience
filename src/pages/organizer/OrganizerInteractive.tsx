import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { FAQ } from "./organizerData";
import { FaqItem } from "./OrganizerSections";
import { supportApi } from "@/lib/support-api";

// ── Income Calculator ─────────────────────────────────────────────────────────
export function OrganizerCalculator() {
  const [ticketPrice, setTicketPrice] = useState(2500);
  const [participants, setParticipants] = useState(12);
  const [eventsPerMonth, setEventsPerMonth] = useState(4);

  const totalRevenue = ticketPrice * participants * eventsPerMonth;
  const platformCost = 2000;
  const netIncome = totalRevenue - platformCost;
  const savings = Math.round(totalRevenue * 0.15); // сколько экономит vs 15% комиссии

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-center">Калькулятор дохода</h2>
        <p className="text-center text-muted-foreground mb-12 text-lg">Посчитай, сколько остаётся у тебя в месяц</p>
        <Card className="max-w-xl mx-auto p-8 border-0 shadow-sm">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Стоимость участия: <span className="text-primary">{ticketPrice.toLocaleString("ru-RU")} ₽</span></label>
              <input type="range" min={500} max={10000} step={100} value={ticketPrice} onChange={(e) => setTicketPrice(+e.target.value)} className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>500 ₽</span><span>10 000 ₽</span></div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Участников на встрече: <span className="text-primary">{participants}</span></label>
              <input type="range" min={2} max={50} step={1} value={participants} onChange={(e) => setParticipants(+e.target.value)} className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>2</span><span>50</span></div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Встреч в месяц: <span className="text-primary">{eventsPerMonth}</span></label>
              <input type="range" min={1} max={20} step={1} value={eventsPerMonth} onChange={(e) => setEventsPerMonth(+e.target.value)} className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1</span><span>20</span></div>
            </div>
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Выручка за месяц</span>
                <span className="font-medium">{totalRevenue.toLocaleString("ru-RU")} ₽</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Стоимость тарифа «Активный»</span>
                <span className="font-medium text-muted-foreground">−{platformCost.toLocaleString("ru-RU")} ₽</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-semibold">Ваш доход</span>
                <span className="text-3xl font-bold text-primary">{netIncome.toLocaleString("ru-RU")} ₽</span>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 flex items-center gap-2">
                <Icon name="TrendingUp" size={16} className="shrink-0" />
                <span>Экономия vs 15% комиссии: <strong>+{savings.toLocaleString("ru-RU")} ₽/мес</strong></span>
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
  const [form, setForm] = useState({ name: "", email: "", telegram: "", event_format: "", additional_info: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Заполните обязательные поля");
      return;
    }
    setSending(true);
    setError("");
    try {
      const message = [
        `Имя: ${form.name}`,
        form.telegram ? `Telegram: ${form.telegram}` : null,
        form.event_format ? `Формат встречи: ${form.event_format}` : null,
        form.additional_info ? `О себе: ${form.additional_info}` : null,
      ].filter(Boolean).join("\n");

      await supportApi.createTicket({
        name: form.name,
        email: form.email,
        subject: "Новый организатор",
        category: "other",
        message,
        captcha_ok: true,
      });
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
            <p className="text-muted-foreground text-lg">Оставь заявку — мы свяжемся в течение 24 часов</p>
          </div>

          {sent ? (
            <Card className="p-10 border-0 shadow-sm text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Check" size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Заявка отправлена!</h3>
              <p className="text-muted-foreground text-sm">Мы свяжемся с вами в течение 24 часов</p>
            </Card>
          ) : (
            <Card className="p-8 border-0 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Имя *</label>
                  <Input placeholder="Как к вам обращаться" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email *</label>
                  <Input type="email" placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Telegram</label>
                  <Input placeholder="@username" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} />
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