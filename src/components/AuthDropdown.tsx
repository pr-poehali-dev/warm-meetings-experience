import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { HttpError } from "@/lib/http";
import { toast } from "sonner";
import { useVkAuth } from "@/components/extensions/vk-auth/useVkAuth";
import { useYandexAuth } from "@/components/extensions/yandex-auth/useYandexAuth";
import { formatPhone, isPhoneComplete } from "@/hooks/usePhoneMask";

const VK_AUTH_URL = "https://functions.poehali.dev/e0433198-3f6a-4251-aacd-b238beddae39";
const YANDEX_AUTH_URL = "https://functions.poehali.dev/1e5f15d8-b432-4341-9a18-4c408d3d80aa";

type Mode = "login" | "reg-type" | "reg-specialist" | "reg-form" | "reg-verify";

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

function YandexIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
      <path fill="currentColor" d="M12.04.04C5.43.04.08,5.39.08,12s5.35,11.96,11.96,11.96,11.96-5.35,11.96-11.96S18.64.04,12.04.04ZM16.04,19.09h-2.47V6.82h-1.11c-2.03,0-3.09,1.03-3.09,2.54,0,1.71.74,2.51,2.25,3.54l1.25.84-3.59,5.37h-2.68l3.22-4.8c-1.85-1.33-2.89-2.62-2.89-4.8,0-2.74,1.91-4.6,5.53-4.6h3.59v14.19Z" />
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

export default function AuthDropdown({ onHero = false }: Props) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");

  // login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // register state
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
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");

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

  const resetRegForm = () => {
    setRegName(""); setRegEmail(""); setRegPhone("");
    setRegPassword(""); setRegConfirm("");
    setConsentTerms(false); setConsentPd(false);
    setSignupRoles([]);
  };

  const closeAndReset = () => {
    setOpen(false);
    setMode("login");
    resetRegForm();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password, remember);
      closeAndReset();
      navigate("/account");
    } catch (err) {
      if (err instanceof HttpError && err.body?.code === "email_not_verified") {
        closeAndReset(); navigate("/login"); return;
      }
      if (err instanceof Error && err.message === "2FA_REQUIRED") {
        closeAndReset(); navigate("/login"); return;
      }
      toast.error(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirm) { toast.error("Пароли не совпадают"); return; }
    if (!isPhoneComplete(regPhone)) { toast.error("Введите полный номер телефона"); return; }
    if (!consentTerms || !consentPd) { toast.error("Необходимо принять условия"); return; }
    setRegSubmitting(true);
    try {
      const result = await register({
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        consent_pd: consentPd,
        signup_roles: signupRoles,
      });
      if (result.email_verification_required) {
        setVerifyEmail(result.email || regEmail);
        setMode("reg-verify");
      } else {
        closeAndReset();
        navigate(signupRoles.length ? "/workspace" : "/account");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setRegSubmitting(false);
    }
  };

  const startSocialLogin = (provider: "vk" | "yandex") => {
    sessionStorage.setItem("oauth_login_only", "1");
    sessionStorage.removeItem("signup_return_url");
    sessionStorage.removeItem("signup_login_provider");
    sessionStorage.removeItem("signup_roles");
    closeAndReset();
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

  const inputClass = "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1";
  const fieldStyle = { color: "hsl(var(--foreground))" };
  const dividerStyle = { borderColor: "hsl(var(--border))" };
  const primaryStyle = { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" };

  const panelWidth = mode === "reg-type" || mode === "reg-specialist" ? "w-88" : "w-80";

  return (
    <div className="relative">
      <button ref={btnRef} className={btnClass} style={btnStyle} onClick={() => setOpen((v) => !v)}>
        <Icon name="LogIn" size={16} />
        <span className="hidden sm:inline">Войти</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[299]" onClick={closeAndReset} />
          <div
            ref={panelRef}
            className={`absolute right-0 top-[calc(100%+10px)] z-[300] ${panelWidth} rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >

            {/* ── ЛОГИН ── */}
            {mode === "login" && (
              <div className="flex flex-col divide-y" style={dividerStyle}>

                {/* Зарегистрироваться → открывает шаг выбора типа */}
                <button
                  className="flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                  onClick={() => setMode("reg-type")}
                >
                  <RadioDot active={false} />
                  <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>
                    Зарегистрироваться
                  </span>
                </button>

                {/* Войти */}
                <div>
                  <div className="flex items-center gap-3 px-5 py-4">
                    <RadioDot active={true} />
                    <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>
                      Войти в личный кабинет
                    </span>
                  </div>

                  <form onSubmit={handleLogin} className="px-5 pb-5 space-y-3">
                    <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Введите данные для входа</p>

                    <div className="border-b pb-3" style={dividerStyle}>
                      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} style={fieldStyle} />
                    </div>

                    <div className="border-b pb-3 flex items-center gap-2" style={dividerStyle}>
                      <input type={showPass ? "text" : "password"} placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1" style={fieldStyle} />
                      <button type="button" onClick={() => setShowPass((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Icon name={showPass ? "EyeOff" : "Eye"} size={15} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <button type="submit" disabled={submitting} className="px-6 py-2 rounded text-sm font-bold tracking-wider uppercase transition-opacity disabled:opacity-60" style={primaryStyle}>
                        {submitting ? <Icon name="Loader2" size={14} className="animate-spin" /> : "Войти"}
                      </button>
                      <label className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setRemember((v) => !v)}>
                        <div className="w-4 h-4 border rounded-sm flex items-center justify-center transition-colors" style={{ borderColor: "hsl(var(--border))", background: remember ? "hsl(var(--primary))" : "transparent" }}>
                          {remember && <Icon name="Check" size={10} style={{ color: "white" } as React.CSSProperties} />}
                        </div>
                        <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Запомнить меня</span>
                      </label>
                    </div>

                    <button type="button" className="text-xs hover:underline" style={{ color: "hsl(var(--primary))" }} onClick={() => { closeAndReset(); navigate("/login?tab=forgot"); }}>
                      Забыли пароль?
                    </button>

                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => startSocialLogin("vk")} disabled={vkAuth.isLoading} className="flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60 hover:opacity-90" style={{ background: "#0077FF" }}>
                        {vkAuth.isLoading ? <Icon name="Loader2" size={14} className="animate-spin" /> : <VkIcon />} ВК
                      </button>
                      <button type="button" onClick={() => startSocialLogin("yandex")} disabled={yandexAuth.isLoading} className="flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60 hover:opacity-90" style={{ background: "#FC3F1D" }}>
                        {yandexAuth.isLoading ? <Icon name="Loader2" size={14} className="animate-spin" /> : <YandexIcon />} Яндекс
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── ШАГ 1: ВЫБОР ТИПА ── */}
            {mode === "reg-type" && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setMode("login")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Icon name="ArrowLeft" size={16} />
                  </button>
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>Регистрация</p>
                </div>
                <p className="text-sm font-semibold mb-4" style={{ color: "hsl(var(--foreground))" }}>
                  Вы хотите ходить в баню или принимать гостей?
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { setSignupRoles([]); setMode("reg-form"); }}
                    className="group flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:border-primary text-left"
                    style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))" }}
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">🛁</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Хочу в баню</p>
                      <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Записываюсь к мастерам, хожу на мероприятия</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setMode("reg-specialist")}
                    className="group flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:border-primary text-left"
                    style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))" }}
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">🔥</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Принимаю гостей</p>
                      <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Парю, провожу мероприятия или предоставляю баню</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ── ШАГ 2: СПЕЦИАЛИЗАЦИЯ ── */}
            {mode === "reg-specialist" && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setMode("reg-type")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Icon name="ArrowLeft" size={16} />
                  </button>
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>Как принимаете гостей?</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { setSignupRoles(["parmaster", "organizer"]); setMode("reg-form"); }}
                    className="group flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:border-primary text-left"
                    style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))" }}
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">🔥</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Мастер и организатор</p>
                      <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Провожу парения, веду расписание и создаю мероприятия</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setSignupRoles(["partner"]); setMode("reg-form"); }}
                    className="group flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:border-primary text-left"
                    style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))" }}
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">🏢</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Управляющий</p>
                      <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Предоставляю баню как площадку для событий</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ── ШАГ 3: ФОРМА ── */}
            {mode === "reg-form" && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setMode(signupRoles.length ? "reg-specialist" : "reg-type")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Icon name="ArrowLeft" size={16} />
                  </button>
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>Создать аккаунт</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="border-b pb-2" style={dividerStyle}>
                    <input type="text" placeholder="Имя и фамилия" value={regName} onChange={(e) => setRegName(e.target.value)} required className={inputClass} style={fieldStyle} />
                  </div>
                  <div className="border-b pb-2" style={dividerStyle}>
                    <input type="email" placeholder="Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className={inputClass} style={fieldStyle} />
                  </div>
                  <div className="border-b pb-2" style={dividerStyle}>
                    <input
                      type="tel" placeholder="+7(___) ___-__-__"
                      value={regPhone}
                      onChange={(e) => setRegPhone(formatPhone(e.target.value))}
                      required className={inputClass} style={fieldStyle}
                    />
                  </div>
                  <div className="border-b pb-2 flex items-center gap-2" style={dividerStyle}>
                    <input type={regShowPass ? "text" : "password"} placeholder="Пароль" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1" style={fieldStyle} />
                    <button type="button" onClick={() => setRegShowPass((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Icon name={regShowPass ? "EyeOff" : "Eye"} size={14} />
                    </button>
                  </div>
                  <div className="border-b pb-2 flex items-center gap-2" style={dividerStyle}>
                    <input type={regShowConfirm ? "text" : "password"} placeholder="Повторите пароль" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} required className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1" style={fieldStyle} />
                    <button type="button" onClick={() => setRegShowConfirm((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Icon name={regShowConfirm ? "EyeOff" : "Eye"} size={14} />
                    </button>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer" onClick={() => setConsentTerms((v) => !v)}>
                    <div className="w-4 h-4 mt-0.5 border rounded-sm flex items-center justify-center shrink-0 transition-colors" style={{ borderColor: "hsl(var(--border))", background: consentTerms ? "hsl(var(--primary))" : "transparent" }}>
                      {consentTerms && <Icon name="Check" size={9} style={{ color: "white" } as React.CSSProperties} />}
                    </div>
                    <span className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
                      Принимаю{" "}
                      <a href="/terms" target="_blank" onClick={(e) => e.stopPropagation()} className="underline hover:no-underline" style={{ color: "hsl(var(--primary))" }}>
                        условия использования
                      </a>
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer" onClick={() => setConsentPd((v) => !v)}>
                    <div className="w-4 h-4 mt-0.5 border rounded-sm flex items-center justify-center shrink-0 transition-colors" style={{ borderColor: "hsl(var(--border))", background: consentPd ? "hsl(var(--primary))" : "transparent" }}>
                      {consentPd && <Icon name="Check" size={9} style={{ color: "white" } as React.CSSProperties} />}
                    </div>
                    <span className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
                      Согласен на обработку{" "}
                      <a href="/privacy" target="_blank" onClick={(e) => e.stopPropagation()} className="underline hover:no-underline" style={{ color: "hsl(var(--primary))" }}>
                        персональных данных
                      </a>
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={regSubmitting || !consentTerms || !consentPd}
                    className="w-full py-2.5 rounded text-sm font-bold tracking-wider uppercase transition-opacity disabled:opacity-50"
                    style={primaryStyle}
                  >
                    {regSubmitting ? <Icon name="Loader2" size={14} className="animate-spin mx-auto" /> : "Зарегистрироваться"}
                  </button>
                </form>
              </div>
            )}

            {/* ── ШАГ 4: ПРОВЕРКА EMAIL ── */}
            {mode === "reg-verify" && (
              <div className="p-5 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(var(--muted))" }}>
                  <Icon name="Mail" size={28} style={{ color: "hsl(var(--primary))" } as React.CSSProperties} />
                </div>
                <p className="text-sm font-semibold mb-2" style={{ color: "hsl(var(--foreground))" }}>
                  Подтвердите почту
                </p>
                <p className="text-xs mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Письмо отправлено на <span className="font-medium" style={{ color: "hsl(var(--foreground))" }}>{verifyEmail}</span>. Перейдите по ссылке в письме для активации.
                </p>
                <button
                  onClick={closeAndReset}
                  className="w-full py-2.5 rounded text-sm font-bold tracking-wider uppercase"
                  style={primaryStyle}
                >
                  Понятно
                </button>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}
