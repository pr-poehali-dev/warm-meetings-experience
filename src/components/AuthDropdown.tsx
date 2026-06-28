import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { HttpError } from "@/lib/http";
import { toast } from "sonner";
import { useVkAuth } from "@/components/extensions/vk-auth/useVkAuth";
import { useYandexAuth } from "@/components/extensions/yandex-auth/useYandexAuth";

const VK_AUTH_URL = "https://functions.poehali.dev/e0433198-3f6a-4251-aacd-b238beddae39";
const YANDEX_AUTH_URL = "https://functions.poehali.dev/1e5f15d8-b432-4341-9a18-4c408d3d80aa";

type Tab = "login";

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

export default function AuthDropdown({ onHero = false }: Props) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password, remember);
      setOpen(false);
      navigate("/account");
    } catch (err) {
      if (err instanceof HttpError && err.body?.code === "email_not_verified") {
        setOpen(false);
        navigate("/login");
        return;
      }
      if (err instanceof Error && err.message === "2FA_REQUIRED") {
        setOpen(false);
        navigate("/login");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setSubmitting(false);
    }
  };

  const startSocialLogin = (provider: "vk" | "yandex") => {
    sessionStorage.setItem("oauth_login_only", "1");
    sessionStorage.removeItem("signup_return_url");
    sessionStorage.removeItem("signup_login_provider");
    sessionStorage.removeItem("signup_roles");
    setOpen(false);
    if (provider === "vk") vkAuth.login();
    else yandexAuth.login();
  };

  const btnClass = `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
    onHero ? "text-white border border-white/30 hover:bg-white/15" : ""
  }`;
  const btnStyle = onHero
    ? {}
    : {
        background: "var(--header-login-bg)",
        border: "1px solid var(--header-login-border)",
        color: "var(--header-nav-color)",
      };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        className={btnClass}
        style={btnStyle}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="LogIn" size={16} />
        <span className="hidden sm:inline">Войти</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[299]" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="absolute right-0 top-[calc(100%+10px)] z-[300] w-80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <div className="flex flex-col divide-y" style={{ borderColor: "hsl(var(--border))" }}>

              {/* Регистрация */}
              <button
                className="flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => { setOpen(false); navigate("/register"); }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: "hsl(var(--border))" }}
                />
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>
                  Зарегистрироваться
                </span>
              </button>

              {/* Вход по email */}
              <div>
                <button
                  className="flex items-center gap-3 px-5 py-4 w-full text-left transition-colors hover:bg-muted/50"
                  onClick={() => setTab("login")}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: tab === "login" ? "hsl(var(--primary))" : "hsl(var(--border))" }}
                  >
                    {tab === "login" && (
                      <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                    )}
                  </div>
                  <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>
                    Войти в личный кабинет
                  </span>
                </button>

                {tab === "login" && (
                  <form onSubmit={handleLogin} className="px-5 pb-5 space-y-3">
                    <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                      Введите данные для входа
                    </p>

                    <div className="border-b pb-3" style={{ borderColor: "hsl(var(--border))" }}>
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1"
                        style={{ color: "hsl(var(--foreground))" }}
                      />
                    </div>

                    <div className="border-b pb-3 flex items-center gap-2" style={{ borderColor: "hsl(var(--border))" }}>
                      <input
                        type={showPass ? "text" : "password"}
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1"
                        style={{ color: "hsl(var(--foreground))" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Icon name={showPass ? "EyeOff" : "Eye"} size={15} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2 rounded text-sm font-bold tracking-wider uppercase transition-opacity disabled:opacity-60"
                        style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                      >
                        {submitting
                          ? <Icon name="Loader2" size={14} className="animate-spin" />
                          : "Войти"
                        }
                      </button>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                          className="w-4 h-4 border rounded-sm flex items-center justify-center transition-colors"
                          style={{
                            borderColor: "hsl(var(--border))",
                            background: remember ? "hsl(var(--primary))" : "transparent",
                          }}
                          onClick={() => setRemember((v) => !v)}
                        >
                          {remember && <Icon name="Check" size={10} style={{ color: "white" } as React.CSSProperties} />}
                        </div>
                        <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                          Запомнить меня
                        </span>
                      </label>
                    </div>

                    <button
                      type="button"
                      className="text-xs transition-colors hover:underline"
                      style={{ color: "hsl(var(--primary))" }}
                      onClick={() => { setOpen(false); navigate("/login?tab=forgot"); }}
                    >
                      Забыли пароль?
                    </button>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startSocialLogin("vk")}
                        disabled={vkAuth.isLoading}
                        className="flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60 hover:opacity-90"
                        style={{ background: "#0077FF" }}
                      >
                        {vkAuth.isLoading ? <Icon name="Loader2" size={14} className="animate-spin" /> : <VkIcon />}
                        ВК
                      </button>
                      <button
                        type="button"
                        onClick={() => startSocialLogin("yandex")}
                        disabled={yandexAuth.isLoading}
                        className="flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60 hover:opacity-90"
                        style={{ background: "#FC3F1D" }}
                      >
                        {yandexAuth.isLoading ? <Icon name="Loader2" size={14} className="animate-spin" /> : <YandexIcon />}
                        Яндекс
                      </button>
                    </div>
                  </form>
                )}
              </div>



            </div>
          </div>
        </>
      )}
    </div>
  );
}