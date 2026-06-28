import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { HttpError } from "@/lib/http";
import { toast } from "sonner";

type Tab = "login" | "register";

interface Props {
  onHero?: boolean;
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
      await login(email, password);
      setOpen(false);
      navigate("/account");
    } catch (err) {
      if (err instanceof HttpError && err.body?.code === "email_not_verified") {
        setOpen(false);
        navigate(`/login`);
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

  const btnClass = `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
    onHero
      ? "text-white border border-white/30 hover:bg-white/15"
      : ""
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
              <button
                className="flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => {
                  setOpen(false);
                  navigate("/register");
                }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor: tab === "register" ? "hsl(var(--primary))" : "hsl(var(--border))",
                  }}
                >
                  {tab === "register" && (
                    <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                  )}
                </div>
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>
                  Зарегистрироваться
                </span>
              </button>

              <div>
                <button
                  className="flex items-center gap-3 px-5 py-4 w-full text-left transition-colors hover:bg-muted/50"
                  onClick={() => setTab("login")}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{
                      borderColor: tab === "login" ? "hsl(var(--primary))" : "hsl(var(--border))",
                    }}
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
                        style={{
                          background: "hsl(var(--primary))",
                          color: "hsl(var(--primary-foreground))",
                        }}
                      >
                        {submitting ? (
                          <Icon name="Loader2" size={14} className="animate-spin" />
                        ) : (
                          "Войти"
                        )}
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
                      onClick={() => { setOpen(false); navigate("/forgot-password"); }}
                    >
                      Забыли пароль?
                    </button>
                  </form>
                )}
              </div>

              <button
                className="flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => { setOpen(false); navigate("/login"); }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 shrink-0"
                  style={{ borderColor: "hsl(var(--border))" }}
                />
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--primary))" }}>
                  Войти через соцсеть
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
