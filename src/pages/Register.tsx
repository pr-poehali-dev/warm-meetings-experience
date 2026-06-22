import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { userAuthApi } from "@/lib/user-api";
import { formatPhone, isPhoneComplete } from "@/hooks/usePhoneMask";
import { toast } from "sonner";
import ConsentModal from "@/components/ConsentModal";
import AppendixLinkModal from "@/components/AppendixLinkModal";
import BathCaptcha, { useBathCaptcha } from "@/components/BathCaptcha";

export default function Register() {
  const { user, loading: authLoading, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "guest";
  const isSpecialist = role === "specialist";
  const signupRoles = searchParams.getAll("signup_roles");
  // Управляющий (partner) работает в кабинете партнёра, мастер/организатор — в /workspace
  const defaultRedirect = isSpecialist ? "/workspace" : "/account";
  const redirectTo = searchParams.get("redirect") || defaultRedirect;
  const [registered, setRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPd, setConsentPd] = useState(false);
  const [consentRules, setConsentRules] = useState(false);
  const [consentPhoto, setConsentPhoto] = useState<"yes" | "no" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const captcha = useBathCaptcha();

  const allRequired = consentTerms && consentPd && consentRules && isPhoneComplete(phone);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, authLoading, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }

    if (!allRequired) {
      toast.error("Необходимо принять все обязательные условия");
      return;
    }

    if (!captcha.isValid) {
      toast.error("Ответьте на вопрос-проверку");
      return;
    }

    setSubmitting(true);
    try {
      await register({ email, name, phone, password, consent_pd: consentPd, consent_photo: consentPhoto, signup_roles: signupRoles });
      setRegisteredName(name);
      setRegisteredEmail(email);
      setRegistered(true);
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

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResending(true);
    try {
      await userAuthApi.resendVerify(registeredEmail);
      toast.success("Письмо отправлено повторно");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось отправить письмо");
    } finally {
      setResending(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-5 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Icon name="Mail" size={32} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Подтвердите почту{registeredName ? `, ${registeredName}` : ""}</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Мы отправили письмо со ссылкой на{" "}
              <span className="font-medium text-foreground">{registeredEmail}</span>.
              Перейдите по ссылке из письма, чтобы войти в аккаунт.
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              Не пришло письмо? Проверьте папку «Спам» или отправьте повторно.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Отправляем...
              </>
            ) : (
              "Отправить письмо повторно"
            )}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate("/login")}>
            Перейти ко входу
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link
            to={`/register${searchParams.get("redirect") ? `?redirect=${searchParams.get("redirect")}` : ""}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="ArrowLeft" size={20} />
            <span className="text-sm font-medium">Назад</span>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Регистрация</h1>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">
              {!isSpecialist
                ? "🛁 Хочу в баню"
                : signupRoles.includes("partner")
                  ? "🏢 Управляющий"
                  : "🔥 Мастер и организатор"}
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 flex justify-center">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="p-6 sm:p-8">
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
                  placeholder="адрес электронной почты"
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
                  placeholder="+7(___) ___-__-__"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
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

              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Обязательные условия</p>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consentTerms"
                    checked={consentTerms}
                    onCheckedChange={(checked) => setConsentTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consentTerms" className="text-sm leading-relaxed font-normal cursor-pointer">
                    Я принимаю условия{" "}
                    <Link
                      to="/terms"
                      className="text-primary hover:text-primary/80 underline underline-offset-2"
                      target="_blank"
                    >
                      Пользовательского соглашения
                    </Link>
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consentPd"
                    checked={consentPd}
                    onCheckedChange={(checked) => setConsentPd(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consentPd" className="text-sm leading-relaxed font-normal cursor-pointer">
                    Я даю согласие на{" "}
                    <ConsentModal trigger="обработку персональных данных" />
                    {" "}({" "}
                    <AppendixLinkModal appendixId={1} label="Приложение №1" />
                    {" "})
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consentRules"
                    checked={consentRules}
                    onCheckedChange={(checked) => setConsentRules(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consentRules" className="text-sm leading-relaxed font-normal cursor-pointer">
                    Я ознакомлен(а) с{" "}
                    <Link
                      to="/terms#rules"
                      className="text-primary hover:text-primary/80 underline underline-offset-2"
                      target="_blank"
                    >
                      Правилами сообщества
                    </Link>
                    {" "}и обязуюсь их соблюдать
                  </Label>
                </div>
              </div>

              <div className="space-y-3 pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Дополнительно</p>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Использование моих фото с мероприятий в рекламных целях{" "}
                    (<AppendixLinkModal appendixId={4} label="Приложение №4" />)
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setConsentPhoto("yes")}
                      className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                        consentPhoto === "yes"
                          ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      Согласен(на)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsentPhoto("no")}
                      className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                        consentPhoto === "no"
                          ? "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      Запрещаю
                    </button>
                  </div>
                </div>
              </div>

              <BathCaptcha {...captcha} />

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !allRequired || !captcha.isValid}
              >
                {submitting ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                    Регистрация...
                  </>
                ) : (
                  "Зарегистрироваться"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Уже есть аккаунт?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
                >
                  Войти
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}