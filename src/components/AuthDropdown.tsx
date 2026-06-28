import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { HttpError } from "@/lib/http";
import { userAuthApi2FA, User } from "@/lib/user-api";
import { toast } from "sonner";
import { useVkAuth } from "@/components/extensions/vk-auth/useVkAuth";
import { useYandexAuth } from "@/components/extensions/yandex-auth/useYandexAuth";
import { VkLoginButton } from "@/components/extensions/vk-auth/VkLoginButton";
import { YandexLoginButton } from "@/components/extensions/yandex-auth/YandexLoginButton";
import { formatPhone, isPhoneComplete } from "@/hooks/usePhoneMask";
import BathCaptcha, { useBathCaptcha } from "@/components/BathCaptcha";
import ConsentModal from "@/components/ConsentModal";
import AppendixLinkModal from "@/components/AppendixLinkModal";
import EmailVerifyPanel from "@/components/auth/EmailVerifyPanel";

const VK_AUTH_URL = "https://functions.poehali.dev/e0433198-3f6a-4251-aacd-b238beddae39";
const YANDEX_AUTH_URL = "https://functions.poehali.dev/1e5f15d8-b432-4341-9a18-4c408d3d80aa";

type RegStep = "reg-type" | "reg-specialist" | "reg-form" | "reg-verify";
type TwoFAScreen = "choose" | "email" | "totp";

interface TwoFAState {
  pendingToken: string;
  method: "totp" | "email" | "vk" | "yandex";
  emailMasked: string | null;
  hasVk: boolean;
  hasYandex: boolean;
}

interface Props {
  onHero?: boolean;
}

function VkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
      <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.596-.19 1.365 1.26 2.179 1.818.615.42 1.083.328 1.083.328l2.175-.03s1.138-.07.598-.964c-.044-.073-.314-.661-1.618-1.869-1.366-1.266-1.183-1.061.462-3.252.999-1.333 1.398-2.146 1.273-2.494-.12-.332-.854-.244-.854-.244l-2.449.015s-.182-.025-.316.056c-.131.079-.216.264-.216.264s-.386 1.028-.901 1.902c-1.088 1.848-1.523 1.946-1.7 1.832-.413-.267-.31-1.075-.31-1.649 0-1.794.272-2.541-.529-2.735-.266-.064-.462-.107-1.142-.114-.873-.009-1.612.003-2.03.208-.279.137-.494.442-.363.459.162.021.529.099.723.364.251.342.242 1.11.242 1.11s.144 2.111-.336 2.372c-.33.18-.783-.187-1.755-1.866-.498-.859-.874-1.81-.874-1.81s-.072-.177-.201-.272c-.156-.115-.375-.151-.375-.151l-2.327.015s-.349.01-.477.161c-.114.135-.009.413-.009.413s1.816 4.25 3.87 6.392c1.883 1.965 4.022 1.836 4.022 1.836h.97z" />
    </svg>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <div
      className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
      style={{ borderColor: active ? "hsl(var(--primary))" : "hsl(var(--border))" }}
    >
      {active && <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--primary))" }} />}
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className="w-4 h-4 mt-0.5 border rounded-sm flex items-center justify-center shrink-0 transition-colors cursor-pointer"
      style={{ borderColor: "hsl(var(--border))", background: checked ? "hsl(var(--primary))" : "transparent" }}
    >
      {checked && <Icon name="Check" size={9} style={{ color: "white" } as React.CSSProperties} />}
    </div>
  );
}

export default function AuthDropdown({ onHero = false }: Props) {
  const { login, register, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<"register" | "login">("login");
  const [regStep, setRegStep] = useState<RegStep>("reg-type");

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 2FA
  const [twoFA, setTwoFA] = useState<TwoFAState | null>(null);
  const [twoFAScreen, setTwoFAScreen] = useState<TwoFAScreen>("choose");
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAEmailMasked, setTwoFAEmailMasked] = useState("");
  const [twoFAVerifying, setTwoFAVerifying] = useState(false);
  const [twoFAResending, setTwoFAResending] = useState(false);
  const [twoFACooldown, setTwoFACooldown] = useState(0);

  // register
  const [signupRoles, setSignupRoles] = useState<string[]>([]);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regShowPass, setRegShowPass] = useState(false);
  const [regShowConfirm, setRegShowConfirm] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPd, setConsentPd] = useState(false);
  const [consentRules, setConsentRules] = useState(false);
  const [consentPhoto, setConsentPhoto] = useState<"yes" | "no" | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const captcha = useBathCaptcha();

  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

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

  const consentsAccepted = consentTerms && consentPd && consentRules;
  const allRequired = consentsAccepted && isPhoneComplete(regPhone);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (twoFACooldown <= 0) return;
    const t = setInterval(() => setTwoFACooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [twoFACooldown]);

  const resetReg = () => {
    setRegStep("reg-type"); setSignupRoles([]);
    setRegName(""); setRegEmail(""); setRegPhone("");
    setRegPassword(""); setRegConfirm("");
    setConsentTerms(false); setConsentPd(false); setConsentRules(false);
    setConsentPhoto(null); setVerifyEmail("");
    captcha.reset?.();
  };

  const reset2FA = () => {
    setTwoFA(null); setTwoFAScreen("choose");
    setTwoFACode(""); setTwoFAEmailMasked(""); setTwoFACooldown(0);
  };

  const closeAll = () => { setOpen(false); resetReg(); reset2FA(); };

  const getRedirectPath = (userData?: { roles?: { slug: string }[] } | null) => {
    const roles = userData?.roles?.map((r) => r.slug) ?? [];
    if (roles.some((s) => ["parmaster", "organizer", "partner"].includes(s))) return "/workspace";
    return "/account";
  };

  const on2FASuccess = (token: string, user: User) => {
    loginWithToken(token, user);
    closeAll();
    navigate(getRedirectPath(user));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const loggedUser = await login(email, password, remember);
      closeAll();
      navigate(getRedirectPath(loggedUser));
    } catch (err) {
      if (err instanceof HttpError && err.body?.code === "email_not_verified") {
        closeAll(); navigate("/login"); return;
      }
      if (err instanceof Error && err.message === "2FA_REQUIRED") {
        const e2fa = err as Error & {
          pending_token?: string; method?: string;
          email_masked?: string | null; has_vk?: boolean; has_yandex?: boolean;
        };
        const method = (e2fa.method || "email") as TwoFAState["method"];
        const state: TwoFAState = {
          pendingToken: e2fa.pending_token || "",
          method,
          emailMasked: e2fa.email_masked ?? null,
          hasVk: !!e2fa.has_vk,
          hasYandex: !!e2fa.has_yandex,
        };
        setTwoFA(state);
        setTwoFAEmailMasked(state.emailMasked || "");
        setTwoFAScreen(method === "totp" ? "totp" : method === "email" ? "email" : "choose");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setSubmitting(false);
    }
  };

  const handle2FAVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFA || twoFACode.length !== 6) { toast.error("Введите 6-значный код"); return; }
    setTwoFAVerifying(true);
    try {
      const data = await userAuthApi2FA.loginVerifyEmail(twoFA.pendingToken, twoFACode);
      on2FASuccess(data.token, data.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Неверный код");
    } finally { setTwoFAVerifying(false); }
  };

  const handle2FAVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFA || twoFACode.length < 6) { toast.error("Введите код из приложения"); return; }
    setTwoFAVerifying(true);
    try {
      const data = await userAuthApi2FA.verify2FA(twoFA.pendingToken, twoFACode);
      on2FASuccess(data.token, data.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Неверный код");
    } finally { setTwoFAVerifying(false); }
  };

  const handle2FAResend = async () => {
    if (!twoFA) return;
    setTwoFAResending(true);
    try {
      const data = await userAuthApi2FA.loginResendEmail(twoFA.pendingToken);
      setTwoFAEmailMasked(data.email_masked);
      setTwoFACooldown(60);
      toast.success("Код отправлен повторно");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось отправить");
    } finally { setTwoFAResending(false); }
  };

  const handle2FAOAuth = async (provider: "vk" | "yandex") => {
    if (!twoFA) return;
    try {
      const data = await userAuthApi2FA.loginStartOAuth(twoFA.pendingToken, provider);
      if (provider === "vk") {
        sessionStorage.setItem("login_2fa_vk_pending", twoFA.pendingToken);
        sessionStorage.setItem("login_2fa_vk_state", data.state);
        if (data.code_verifier) sessionStorage.setItem("login_2fa_vk_verifier", data.code_verifier);
      } else {
        sessionStorage.setItem("login_2fa_yandex_pending", twoFA.pendingToken);
        sessionStorage.setItem("login_2fa_yandex_state", data.state);
      }
      window.location.href = data.auth_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось запустить OAuth");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirm) { toast.error("Пароли не совпадают"); return; }
    if (!allRequired) { toast.error("Необходимо принять все обязательные условия"); return; }
    if (!captcha.isValid) { toast.error("Ответьте на вопрос-проверку"); return; }
    setRegSubmitting(true);
    try {
      await register({
        name: regName, email: regEmail, phone: regPhone,
        password: regPassword, consent_pd: consentPd,
        consent_photo: consentPhoto, signup_roles: signupRoles,
      });
      setVerifyEmail(regEmail);
      setRegStep("reg-verify");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setRegSubmitting(false);
    }
  };

  const startSocialSignup = (provider: "vk" | "yandex") => {
    if (!consentsAccepted) { toast.error("Сначала примите обязательные условия"); return; }
    sessionStorage.removeItem("oauth_login_only");
    const redirectTo = signupRoles.some(r => ["parmaster","organizer","partner"].includes(r)) ? "/workspace" : "/account";
    sessionStorage.setItem("signup_return_url", redirectTo);
    sessionStorage.setItem("signup_login_provider", provider);
    sessionStorage.setItem("signup_roles", JSON.stringify(signupRoles));
    closeAll();
    if (provider === "vk") vkAuth.login(); else yandexAuth.login();
  };

  const startSocialLogin = (provider: "vk" | "yandex") => {
    sessionStorage.setItem("oauth_login_only", "1");
    sessionStorage.removeItem("signup_return_url");
    sessionStorage.removeItem("signup_login_provider");
    sessionStorage.removeItem("signup_roles");
    closeAll();
    if (provider === "vk") vkAuth.login(); else yandexAuth.login();
  };

  const btnClass = `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
    onHero ? "text-white border border-white/30 hover:bg-white/15" : ""
  }`;
  const btnStyle = onHero ? {} : {
    background: "var(--header-login-bg)",
    border: "1px solid var(--header-login-border)",
    color: "var(--header-nav-color)",
  };

  const inp = "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1.5";
  const fg = { color: "hsl(var(--foreground))" };
  const borderStyle = { borderColor: "hsl(var(--border))" };
  const primary = { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" };
  const muted = { color: "hsl(var(--muted-foreground))" };

  return (
    <div className="relative">
      <button ref={btnRef} className={btnClass} style={btnStyle} onClick={() => setOpen((v) => !v)}>
        <Icon name="LogIn" size={16} />
        <span className="hidden sm:inline">Войти</span>
      </button>

      {open && (
        <>
          {/* Затемнение — только на мобильных */}
          <div className="fixed inset-0 z-[299] bg-black/40 backdrop-blur-sm sm:hidden" onClick={closeAll} />
          <div
            ref={panelRef}
            className={[
              "z-[300] rounded-2xl shadow-2xl overflow-y-auto animate-in fade-in zoom-in-95 duration-200",
              // Мобильные: модальное по центру экрана
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[85vh]",
              // Десктоп: выпадающее под кнопкой справа
              "sm:absolute sm:left-auto sm:right-0 sm:top-full sm:translate-x-0 sm:-translate-y-0 sm:mt-2 sm:max-h-[80vh]",
            ].join(" ")}
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              width: "min(360px, calc(100vw - 2rem))",
            }}
          >
            {/* ══ 2FA ══ */}
            {twoFA ? (
              <div className="p-5">
                {twoFAScreen === "choose" && (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <button onClick={reset2FA} className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="ArrowLeft" size={16} /></button>
                      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>Подтверждение входа</p>
                    </div>
                    <p className="text-xs mb-4" style={muted}>Выберите способ подтверждения</p>
                    <div className="space-y-2">
                      <button onClick={() => { setTwoFAScreen("totp"); setTwoFACode(""); }} className="w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover:border-primary" style={borderStyle}>
                        <Icon name="Shield" size={18} style={{ color: "hsl(var(--primary))" } as React.CSSProperties} />
                        <span className="text-sm" style={fg}>Код из приложения</span>
                      </button>
                      <button onClick={() => { setTwoFAScreen("email"); setTwoFACode(""); }} className="w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover:border-primary" style={borderStyle}>
                        <Icon name="Mail" size={18} style={{ color: "hsl(var(--primary))" } as React.CSSProperties} />
                        <div>
                          <p className="text-sm" style={fg}>Код из письма</p>
                          {twoFAEmailMasked && <p className="text-xs" style={muted}>{twoFAEmailMasked}</p>}
                        </div>
                      </button>
                      {twoFA.hasVk && <button onClick={() => handle2FAOAuth("vk")} className="w-full flex items-center gap-3 p-3 rounded-lg text-white text-sm font-medium hover:opacity-90" style={{ background: "#0077FF" }}><VkIcon /> ВКонтакте</button>}
                    </div>
                    <button onClick={reset2FA} className="mt-3 w-full text-xs text-center hover:underline" style={muted}>Вернуться к вводу пароля</button>
                  </>
                )}
                {twoFAScreen === "email" && (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <button onClick={() => { setTwoFAScreen("choose"); setTwoFACode(""); }} className="text-muted-foreground hover:text-foreground"><Icon name="ArrowLeft" size={16} /></button>
                      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>Код из письма</p>
                    </div>
                    <p className="text-xs mb-4" style={muted}>Отправили код на {twoFAEmailMasked && <span className="font-medium" style={fg}>{twoFAEmailMasked}</span>}</p>
                    <form onSubmit={handle2FAVerifyEmail} className="space-y-3">
                      <div className="border-b pb-2" style={borderStyle}>
                        <input type="text" inputMode="numeric" placeholder="000000" value={twoFACode} onChange={(e) => setTwoFACode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} autoFocus className="w-full bg-transparent text-center text-lg tracking-[0.4em] font-mono outline-none py-1.5" style={fg} />
                      </div>
                      <button type="submit" disabled={twoFAVerifying || twoFACode.length !== 6} className="w-full py-2.5 rounded text-sm font-bold tracking-widest uppercase disabled:opacity-50" style={primary}>
                        {twoFAVerifying ? <Icon name="Loader2" size={14} className="animate-spin mx-auto" /> : "Войти"}
                      </button>
                      <div className="flex items-center justify-between">
                        <button type="button" onClick={() => { setTwoFAScreen("choose"); setTwoFACode(""); }} className="text-xs hover:underline" style={muted}>Другой способ</button>
                        <button type="button" onClick={handle2FAResend} disabled={twoFAResending || twoFACooldown > 0} className="text-xs hover:underline disabled:opacity-50" style={{ color: "hsl(var(--primary))" }}>
                          {twoFACooldown > 0 ? `Повтор через ${twoFACooldown} с` : twoFAResending ? "Отправка..." : "Отправить ещё раз"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
                {twoFAScreen === "totp" && (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <button onClick={() => { setTwoFAScreen("choose"); setTwoFACode(""); }} className="text-muted-foreground hover:text-foreground"><Icon name="ArrowLeft" size={16} /></button>
                      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>Код из приложения</p>
                    </div>
                    <p className="text-xs mb-4" style={muted}>Введите код из приложения-аутентификатора</p>
                    <form onSubmit={handle2FAVerifyTotp} className="space-y-3">
                      <div className="border-b pb-2" style={borderStyle}>
                        <input type="text" placeholder="000000" value={twoFACode} onChange={(e) => setTwoFACode(e.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 8))} autoFocus className="w-full bg-transparent text-center text-lg tracking-[0.4em] font-mono outline-none py-1.5" style={fg} />
                      </div>
                      <button type="submit" disabled={twoFAVerifying || twoFACode.length < 6} className="w-full py-2.5 rounded text-sm font-bold tracking-widest uppercase disabled:opacity-50" style={primary}>
                        {twoFAVerifying ? <Icon name="Loader2" size={14} className="animate-spin mx-auto" /> : "Подтвердить"}
                      </button>
                      <button type="button" onClick={reset2FA} className="w-full text-xs text-center hover:underline" style={muted}>Вернуться к вводу пароля</button>
                    </form>
                  </>
                )}
              </div>
            ) : (

              /* ══ ОСНОВНАЯ ПАНЕЛЬ ══ */
              <div className="divide-y" style={borderStyle}>

                {/* ── РЕГИСТРАЦИЯ ── */}
                <div>
                  <button
                    className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                    onClick={() => {
                      if (expanded === "register") { setExpanded("login"); resetReg(); }
                      else setExpanded("register");
                    }}
                  >
                    <RadioDot active={expanded === "register"} />
                    <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>
                      Зарегистрироваться
                    </span>
                  </button>

                  {expanded === "register" && (
                    <div className="px-5 pb-5">

                      {/* Шаг 1 — выбор типа */}
                      {regStep === "reg-type" && (
                        <>
                          <p className="text-base font-bold mb-1 leading-snug" style={fg}>Вы хотите ходить в баню или принимать гостей?</p>
                          <p className="text-xs mb-4" style={muted}>Выберите, чтобы мы настроили всё под вас</p>
                          <div className="space-y-2">
                            <button onClick={() => { setSignupRoles([]); setRegStep("reg-form"); }} className="w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover:border-primary" style={borderStyle}>
                              <span className="text-xl shrink-0">🛁</span>
                              <div>
                                <p className="text-sm font-medium" style={fg}>Хочу в баню</p>
                                <p className="text-xs" style={muted}>Записываюсь к мастерам, хожу на мероприятия</p>
                              </div>
                            </button>
                            <button onClick={() => setRegStep("reg-specialist")} className="w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover:border-primary" style={borderStyle}>
                              <span className="text-xl shrink-0">🔥</span>
                              <div>
                                <p className="text-sm font-medium" style={fg}>Принимаю гостей</p>
                                <p className="text-xs" style={muted}>Парю, провожу мероприятия или предоставляю баню</p>
                              </div>
                            </button>
                          </div>
                        </>
                      )}

                      {/* Шаг 2 — специализация */}
                      {regStep === "reg-specialist" && (
                        <>
                          <button onClick={() => setRegStep("reg-type")} className="flex items-center gap-1 text-xs mb-3 hover:opacity-70" style={muted}>
                            <Icon name="ArrowLeft" size={13} /> Назад
                          </button>
                          <p className="text-sm font-semibold mb-1" style={fg}>Как будете принимать гостей?</p>
                          <div className="space-y-2 mt-3">
                            <button onClick={() => { setSignupRoles(["parmaster", "organizer"]); setRegStep("reg-form"); }} className="w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover:border-primary" style={borderStyle}>
                              <span className="text-xl shrink-0">🔥</span>
                              <div>
                                <p className="text-sm font-medium" style={fg}>Мастер и организатор</p>
                                <p className="text-xs" style={muted}>Провожу парения, веду расписание и создаю мероприятия</p>
                              </div>
                            </button>
                            <button onClick={() => { setSignupRoles(["partner"]); setRegStep("reg-form"); }} className="w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover:border-primary" style={borderStyle}>
                              <span className="text-xl shrink-0">🏢</span>
                              <div>
                                <p className="text-sm font-medium" style={fg}>Управляющий</p>
                                <p className="text-xs" style={muted}>Предоставляю баню как площадку для событий</p>
                              </div>
                            </button>
                          </div>
                        </>
                      )}

                      {/* Шаг 3 — форма */}
                      {regStep === "reg-form" && (
                        <>
                          <button onClick={() => setRegStep(signupRoles.length ? "reg-specialist" : "reg-type")} className="flex items-center gap-1 text-xs mb-3 hover:opacity-70" style={muted}>
                            <Icon name="ArrowLeft" size={13} /> Назад
                          </button>
                          <form onSubmit={handleRegister} className="space-y-0">
                            <div className="border-b" style={borderStyle}>
                              <input type="text" placeholder="Имя" value={regName} onChange={(e) => setRegName(e.target.value)} required className={inp} style={fg} />
                            </div>
                            <div className="border-b" style={borderStyle}>
                              <input type="email" placeholder="Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className={inp} style={fg} />
                            </div>
                            <div className="border-b" style={borderStyle}>
                              <input type="tel" placeholder="+7(___) ___-__-__" value={regPhone} onChange={(e) => setRegPhone(formatPhone(e.target.value))} required className={inp} style={fg} />
                            </div>
                            <div className="border-b flex items-center gap-2" style={borderStyle}>
                              <input type={regShowPass ? "text" : "password"} placeholder="Пароль" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1.5" style={fg} />
                              <button type="button" onClick={() => setRegShowPass(v => !v)} className="text-muted-foreground hover:text-foreground"><Icon name={regShowPass ? "EyeOff" : "Eye"} size={14} /></button>
                            </div>
                            <div className="border-b flex items-center gap-2" style={borderStyle}>
                              <input type={regShowConfirm ? "text" : "password"} placeholder="Повторите пароль" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} required className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1.5" style={fg} />
                              <button type="button" onClick={() => setRegShowConfirm(v => !v)} className="text-muted-foreground hover:text-foreground"><Icon name={regShowConfirm ? "EyeOff" : "Eye"} size={14} /></button>
                            </div>

                            {/* Обязательные условия */}
                            <div className="pt-3 space-y-2.5 border-b pb-3" style={borderStyle}>
                              <p className="text-xs font-medium uppercase tracking-wide" style={muted}>Обязательные условия</p>
                              <label className="flex items-start gap-2 cursor-pointer">
                                <Checkbox checked={consentTerms} onChange={() => setConsentTerms(v => !v)} />
                                <span className="text-xs leading-relaxed" style={muted}>
                                  Принимаю условия{" "}
                                  <Link to="/terms" target="_blank" onClick={e => e.stopPropagation()} className="underline" style={{ color: "hsl(var(--primary))" }}>Пользовательского соглашения</Link>
                                </span>
                              </label>
                              <label className="flex items-start gap-2 cursor-pointer">
                                <Checkbox checked={consentPd} onChange={() => setConsentPd(v => !v)} />
                                <span className="text-xs leading-relaxed" style={muted}>
                                  Даю согласие на <ConsentModal trigger="обработку персональных данных" />{" "}
                                  (<AppendixLinkModal appendixId={1} label="Приложение №1" />)
                                </span>
                              </label>
                              <label className="flex items-start gap-2 cursor-pointer">
                                <Checkbox checked={consentRules} onChange={() => setConsentRules(v => !v)} />
                                <span className="text-xs leading-relaxed" style={muted}>
                                  Ознакомлен(а) с{" "}
                                  <Link to="/terms#rules" target="_blank" onClick={e => e.stopPropagation()} className="underline" style={{ color: "hsl(var(--primary))" }}>Правилами сообщества</Link>
                                  {" "}и обязуюсь соблюдать
                                </span>
                              </label>
                            </div>

                            {/* Согласие на фото */}
                            <div className="pt-3 pb-3 border-b space-y-2" style={borderStyle}>
                              <p className="text-xs leading-relaxed" style={muted}>
                                Использование моих фото с мероприятий в рекламных целях{" "}
                                (<AppendixLinkModal appendixId={4} label="Приложение №4" />)
                              </p>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setConsentPhoto("yes")} className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${consentPhoto === "yes" ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
                                  Согласен(на)
                                </button>
                                <button type="button" onClick={() => setConsentPhoto("no")} className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${consentPhoto === "no" ? "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
                                  Запрещаю
                                </button>
                              </div>
                            </div>

                            {/* Капча */}
                            <div className="pt-3">
                              <BathCaptcha {...captcha} />
                            </div>

                            <button type="submit" disabled={regSubmitting || !allRequired || !captcha.isValid} className="mt-3 w-full py-2.5 rounded text-sm font-bold tracking-widest uppercase transition-opacity disabled:opacity-50" style={primary}>
                              {regSubmitting ? <Icon name="Loader2" size={14} className="animate-spin mx-auto" /> : "Зарегистрироваться"}
                            </button>

                            {/* Соцсети */}
                            <div className="mt-3 space-y-2">
                              <div className="relative">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" style={borderStyle} /></div>
                                <div className="relative flex justify-center text-xs uppercase">
                                  <span className="px-2" style={{ background: "hsl(var(--card))", ...muted }}>или</span>
                                </div>
                              </div>
                              {!consentsAccepted && (
                                <p className="text-xs text-center" style={muted}>Примите обязательные условия выше для регистрации через соцсети</p>
                              )}
                              <VkLoginButton onClick={() => startSocialSignup("vk")} isLoading={vkAuth.isLoading} disabled={!consentsAccepted} buttonText="Войти через ВК" className="w-full" />
                              <YandexLoginButton onClick={() => startSocialSignup("yandex")} isLoading={yandexAuth.isLoading} disabled={!consentsAccepted} buttonText="Войти через Яндекс" className="w-full" />
                            </div>
                          </form>
                        </>
                      )}

                      {/* Шаг 4 — подтверждение email */}
                      {regStep === "reg-verify" && (
                        <EmailVerifyPanel
                          email={verifyEmail}
                          onVerified={(token, verifiedUser) => {
                            loginWithToken(token, verifiedUser);
                            closeAll();
                            navigate(getRedirectPath(verifiedUser));
                          }}
                        />
                      )}

                    </div>
                  )}
                </div>

                {/* ── ВХОД ── */}
                <div>
                  <button
                    className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                    onClick={() => setExpanded(expanded === "login" ? "register" : "login")}
                  >
                    <RadioDot active={expanded === "login"} />
                    <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>
                      Войти в личный кабинет
                    </span>
                  </button>

                  {expanded === "login" && (
                    <form onSubmit={handleLogin} className="px-5 pb-5 space-y-3">
                      <p className="text-xs" style={muted}>Введите данные для входа</p>
                      <div className="border-b pb-3" style={borderStyle}>
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inp} style={fg} />
                      </div>
                      <div className="border-b pb-3 flex items-center gap-2" style={borderStyle}>
                        <input type={showPass ? "text" : "password"} placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1" style={fg} />
                        <button type="button" onClick={() => setShowPass(v => !v)} className="text-muted-foreground hover:text-foreground">
                          <Icon name={showPass ? "EyeOff" : "Eye"} size={15} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <button type="submit" disabled={submitting} className="px-6 py-2 rounded text-sm font-bold tracking-wider uppercase disabled:opacity-60" style={primary}>
                          {submitting ? <Icon name="Loader2" size={14} className="animate-spin" /> : "Войти"}
                        </button>
                        <label className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setRemember(v => !v)}>
                          <div className="w-4 h-4 border rounded-sm flex items-center justify-center transition-colors" style={{ borderColor: "hsl(var(--border))", background: remember ? "hsl(var(--primary))" : "transparent" }}>
                            {remember && <Icon name="Check" size={10} style={{ color: "white" } as React.CSSProperties} />}
                          </div>
                          <span className="text-xs" style={muted}>Запомнить меня</span>
                        </label>
                      </div>
                      <button type="button" className="text-xs hover:underline" style={{ color: "hsl(var(--primary))" }} onClick={() => { closeAll(); navigate("/login?tab=forgot"); }}>
                        Забыли пароль?
                      </button>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => startSocialLogin("vk")} disabled={vkAuth.isLoading} className="flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 hover:opacity-90" style={{ background: "#0077FF" }}>
                          {vkAuth.isLoading ? <Icon name="Loader2" size={14} className="animate-spin" /> : <VkIcon />} ВК
                        </button>
                        <button type="button" onClick={() => startSocialLogin("yandex")} disabled={yandexAuth.isLoading} className="flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 hover:opacity-90" style={{ background: "#FC3F1D" }}>
                          {yandexAuth.isLoading ? <Icon name="Loader2" size={14} className="animate-spin" /> : "Я"} Яндекс
                        </button>
                      </div>
                    </form>
                  )}
                </div>

              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}