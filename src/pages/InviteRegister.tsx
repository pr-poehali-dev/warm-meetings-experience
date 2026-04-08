import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ConsentModal from "@/components/ConsentModal";
import { format, parseISO, isValid } from "date-fns";
import { ru } from "date-fns/locale";

const EVENTS_API = "https://functions.poehali.dev/a8aa8917-24e9-450a-8ed1-28225a582a59";

interface EventPreview {
  id: number;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  bath_name: string;
  image_url: string;
  event_type: string;
}

export default function InviteRegister() {
  const { user, loading: authLoading, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteEventId = searchParams.get("invite_event");
  const eventId = inviteEventId ? parseInt(inviteEventId) : null;
  const redirectTo = `/organizer-cabinet?invite_event=${eventId}`;

  const [eventPreview, setEventPreview] = useState<EventPreview | null>(null);
  const [eventLoading, setEventLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Если уже залогинен — отправляем сразу принимать инвайт
  useEffect(() => {
    if (!authLoading && user && eventId) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, authLoading, navigate, redirectTo, eventId]);

  // Загружаем превью события
  useEffect(() => {
    if (!eventId) { setEventLoading(false); return; }
    fetch(`${EVENTS_API}/?slug=event-${eventId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setEventPreview(data))
      .catch(() => {})
      .finally(() => setEventLoading(false));
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    setSubmitting(true);
    try {
      await register({ email, name, phone, password, consent_pd: consent });
      navigate(redirectTo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Icon name="LinkOff" size={40} className="mx-auto text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Ссылка недействительна</p>
          <Button variant="outline" onClick={() => navigate("/")}>На главную</Button>
        </div>
      </div>
    );
  }

  let dateStr = "";
  if (eventPreview?.event_date) {
    try {
      const d = parseISO(eventPreview.event_date);
      if (isValid(d)) dateStr = format(d, "d MMMM yyyy, EEEE", { locale: ru });
    } catch (_) { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="ArrowLeft" size={18} />
            <span className="text-sm">На сайт</span>
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="Flame" size={13} className="text-primary" />
            </div>
            <span className="font-semibold text-sm">СПАРКОМ</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 max-w-lg">

        {/* Invite banner */}
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-3">
            <Icon name="UserPlus" size={13} />
            Приглашение стать соорганизатором
          </div>
          <h1 className="text-2xl font-bold">Вас приглашают<br />в команду встречи</h1>
          <p className="text-muted-foreground text-sm">
            Создайте аккаунт, чтобы принять приглашение и получить доступ к кабинету организатора
          </p>
        </div>

        {/* Event preview card */}
        {eventLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm mb-6">
            <Icon name="Loader2" size={16} className="animate-spin" />
            Загрузка встречи...
          </div>
        ) : eventPreview ? (
          <Card className="mb-8 overflow-hidden border-primary/20">
            {eventPreview.image_url && (
              <div className="h-36 overflow-hidden">
                <img src={eventPreview.image_url} alt={eventPreview.title} className="w-full h-full object-cover" />
              </div>
            )}
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {eventPreview.event_type}
                </span>
                <a
                  href={`/events/${eventPreview.slug || `event-${eventPreview.id}`}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Открыть встречу
                  <Icon name="ExternalLink" size={11} />
                </a>
              </div>
              <h2 className="font-semibold text-base">{eventPreview.title}</h2>
              <div className="space-y-1 text-xs text-muted-foreground">
                {dateStr && (
                  <div className="flex items-center gap-1.5">
                    <Icon name="Calendar" size={12} />
                    {dateStr}
                    {eventPreview.start_time && ` · ${eventPreview.start_time.slice(0, 5)}`}
                  </div>
                )}
                {eventPreview.bath_name && (
                  <div className="flex items-center gap-1.5">
                    <Icon name="MapPin" size={12} />
                    {eventPreview.bath_name}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Registration form */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <h2 className="font-semibold text-base mb-5">Создать аккаунт</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (999) 123-45-67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Придумайте пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Повторите пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(checked === true)}
                />
                <Label htmlFor="consent" className="text-sm leading-relaxed font-normal cursor-pointer">
                  Даю{" "}
                  <ConsentModal trigger="согласие на обработку персональных данных" />
                  {" "}в соответствии с{" "}
                  <Link to="/privacy" className="text-primary hover:text-primary/80 underline underline-offset-2" target="_blank">
                    Политикой конфиденциальности
                  </Link>
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !consent}>
                {submitting ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                    Создаём аккаунт...
                  </>
                ) : (
                  <>
                    <Icon name="UserCheck" size={16} className="mr-2" />
                    Зарегистрироваться и принять приглашение
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                Уже есть аккаунт?{" "}
                <Link
                  to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
                  className="text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
                >
                  Войти
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What happens next */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: "UserCheck", label: "Регистрация", desc: "Создаёте аккаунт" },
            { icon: "Key", label: "Доступ", desc: "Получаете роль организатора" },
            { icon: "LayoutDashboard", label: "Кабинет", desc: "Управляете встречей" },
          ].map((step) => (
            <div key={step.label} className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Icon name={step.icon} size={18} className="text-primary" />
              </div>
              <div className="font-medium text-sm">{step.label}</div>
              <div className="text-xs text-muted-foreground">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}