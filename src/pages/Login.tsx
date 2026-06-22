import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { userAuthApi } from "@/lib/user-api";
import { HttpError } from "@/lib/http";
import { toast } from "sonner";
import { VkLoginButton } from "@/components/extensions/vk-auth/VkLoginButton";
import { useVkAuth } from "@/components/extensions/vk-auth/useVkAuth";
import { YandexLoginButton } from "@/components/extensions/yandex-auth/YandexLoginButton";
import { useYandexAuth } from "@/components/extensions/yandex-auth/useYandexAuth";
import Login2FAChallenge from "@/components/auth/Login2FAChallenge";

const VK_AUTH_URL = "https://functions.poehali.dev/e0433198-3f6a-4251-aacd-b238beddae39";
const YANDEX_AUTH_URL = "https://functions.poehali.dev/1e5f15d8-b432-4341-9a18-4c408d3d80aa";

export default function Login() {
  const { user, loading: authLoading, login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const vkAuth = useVkAuth({
    apiUrls: {
      authUrl: `${VK_AUTH_URL}?action=auth-url`,
      callback: `${VK_AUTH_URL}?action=callback`,
      refresh: `${VK_AUTH_URL}?action=refresh`,
      logout: `${VK_AUTH_URL}?action=logout`,
    },
  });
  const yandexAuth = useYandexAuth({
    apiUrls: {
      authUrl: `${YANDEX_AUTH_URL}?action=auth-url`,
      callback: `${YANDEX_AUTH_URL}?action=callback`,
      refresh: `${YANDEX_AUTH_URL}?action=refresh`,
      logout: `${YANDEX_AUTH_URL}?action=logout`,
    },
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [challenge, setChallenge] = useState<{
    pendingToken: string;
    method: "totp" | "email" | "vk" | "yandex";
    emailMasked: string | null;
    hasVk: boolean;
    hasYandex: boolean;
  } | null>(null);

  const redirectPath = (() => {
    const r = searchParams.get("redirect");
    const token = searchParams.get("token");
    if (r && token) return `${r}?token=${encodeURIComponent(token)}`;
    if (r) return r;
    return "/account";
  })();

  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, authLoading, navigate, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setUnverifiedEmail(null);
    try {
      await login(email, password);
      navigate(redirectPath);
    } catch (err) {
      if (err instanceof HttpError && err.body?.code === "email_not_verified") {
        const em = (err.body.email as string) || email;
        setUnverifiedEmail(em);
        setSubmitting(false);
        return;
      }
      if (err instanceof Error && err.message === "2FA_REQUIRED") {
        const x = err as Error & {
          pending_token?: string;
          method?: string;
          email_masked?: string | null;
          has_vk?: boolean;
          has_yandex?: boolean;
        };
        if (x.pending_token) {
          setChallenge({
            pendingToken: x.pending_token,
            method: (x.method as "totp" | "email" | "vk" | "yandex") || "totp",
            emailMasked: x.email_masked ?? null,
            hasVk: !!x.has_vk,
            hasYandex: !!x.has_yandex,
          });
        }
      } else {
        toast.error(err instanceof Error ? err.message : "Ошибка входа");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      await userAuthApi.resendVerify(unverifiedEmail);
      toast.success("Письмо отправлено повторно");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось отправить письмо");
    } finally {
      setResending(false);
    }
  };

  // Запускает вход через соцсеть в режиме «только вход»: если аккаунта нет —
  // бэкенд не создаёт его, а callback уводит на регистрацию.
  const startSocialLogin = (provider: "vk" | "yandex") => {
    sessionStorage.setItem("oauth_login_only", "1");
    if (provider === "vk") vkAuth.login();
    else yandexAuth.login();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="ArrowLeft" size={20} />
            <span className="text-sm font-medium">Назад</span>
          </Link>
          <h1 className="text-lg font-semibold">Вход</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 flex justify-center">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            {challenge ? (
              <Login2FAChallenge
                pendingToken={challenge.pendingToken}
                initialMethod={challenge.method}
                emailMasked={challenge.emailMasked}
                hasVk={challenge.hasVk}
                hasYandex={challenge.hasYandex}
                onSuccess={(token, userData) => {
                  loginWithToken(token, userData);
                  setChallenge(null);
                  navigate(redirectPath);
                }}
                onCancel={() => setChallenge(null)}
              />
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Label htmlFor="password">Пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Введите пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                        Вход...
                      </>
                    ) : (
                      "Войти"
                    )}
                  </Button>
                </form>

                {unverifiedEmail && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 p-4">
                    <div className="flex items-start gap-3">
                      <Icon name="Mail" size={20} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Подтвердите электронную почту</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Мы отправили письмо со ссылкой на{" "}
                          <span className="font-medium text-foreground">{unverifiedEmail}</span>.
                          Перейдите по ней, чтобы войти.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={handleResend}
                          disabled={resending}
                        >
                          {resending ? (
                            <>
                              <Icon name="Loader2" size={14} className="animate-spin mr-2" />
                              Отправляем...
                            </>
                          ) : (
                            "Отправить письмо повторно"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">или</span>
                    </div>
                  </div>
                  <VkLoginButton
                    onClick={() => startSocialLogin("vk")}
                    isLoading={vkAuth.isLoading}
                    className="w-full"
                  />
                  <YandexLoginButton
                    onClick={() => startSocialLogin("yandex")}
                    isLoading={yandexAuth.isLoading}
                    className="w-full"
                  />
                </div>

                <div className="mt-4 text-center space-y-2">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    Забыли пароль?
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Нет аккаунта?{" "}
                    <Link
                      to="/register"
                      className="text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
                    >
                      Зарегистрироваться
                    </Link>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}