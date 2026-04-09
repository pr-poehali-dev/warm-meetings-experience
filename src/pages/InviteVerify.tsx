import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { organizerApi } from "@/lib/organizer-api";

type VerifyState = "loading" | "verifying" | "success_active" | "success_pending" | "already" | "error" | "wrong_email" | "expired";

export default function InviteVerify() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [state, setState] = useState<VerifyState>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setState("error");
      setErrorMsg("Ссылка недействительна — токен отсутствует.");
      return;
    }

    if (!user) {
      navigate(`/login?redirect=/invite-verify&token=${encodeURIComponent(token)}`, { replace: true });
      return;
    }

    setState("verifying");
    organizerApi.verifyInvite(token)
      .then((res) => {
        if (res.status === "active") {
          setState(res.already ? "already" : "success_active");
        } else if (res.status === "pending") {
          setState(res.already ? "already" : "success_pending");
        } else if (res.status === "owner") {
          setState("already");
        }
      })
      .catch((err: Error) => {
        const msg = err.message || "";
        if (msg.includes("уже использовано")) setState("already");
        else if (msg.includes("истёк")) setState("expired");
        else if (msg.includes("приглашение отправлено на")) {
          setState("wrong_email");
          setErrorMsg(msg);
        } else {
          setState("error");
          setErrorMsg(msg || "Не удалось обработать приглашение.");
        }
      });
  }, [authLoading, user, token, navigate]);

  if (authLoading || state === "loading" || state === "verifying") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Icon name="Loader2" size={36} className="animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-sm">
            {state === "verifying" ? "Подтверждаем приглашение…" : "Загрузка…"}
          </p>
        </div>
      </div>
    );
  }

  const content: Record<VerifyState, { icon: string; iconClass: string; bg: string; title: string; desc: string; action?: React.ReactNode }> = {
    success_active: {
      icon: "CheckCircle2", iconClass: "text-green-500", bg: "bg-green-50",
      title: "Вы добавлены как соорганизатор!",
      desc: "Email подтверждён. Теперь вы можете управлять этой встречей в кабинете организатора.",
      action: <Button onClick={() => navigate("/organizer-cabinet")}>Перейти в кабинет</Button>,
    },
    success_pending: {
      icon: "Clock", iconClass: "text-amber-500", bg: "bg-amber-50",
      title: "Email подтверждён. Заявка отправлена!",
      desc: "Администратор рассмотрит вашу заявку и выдаст доступ к кабинету организатора. Мы уведомим вас по email.",
      action: <Button variant="outline" onClick={() => navigate("/")}>На главную</Button>,
    },
    already: {
      icon: "Info", iconClass: "text-blue-500", bg: "bg-blue-50",
      title: "Вы уже в команде",
      desc: "Это приглашение уже было использовано. Переходите в кабинет организатора.",
      action: <Button onClick={() => navigate("/organizer-cabinet")}>В кабинет</Button>,
    },
    wrong_email: {
      icon: "AlertCircle", iconClass: "text-red-500", bg: "bg-red-50",
      title: "Неверный аккаунт",
      desc: errorMsg,
      action: <Button variant="outline" onClick={() => navigate("/login")}>Сменить аккаунт</Button>,
    },
    expired: {
      icon: "TimerOff", iconClass: "text-muted-foreground", bg: "bg-muted",
      title: "Ссылка устарела",
      desc: "Срок действия приглашения истёк (7 дней). Попросите организатора отправить новое приглашение.",
      action: <Button variant="outline" onClick={() => navigate("/")}>На главную</Button>,
    },
    error: {
      icon: "XCircle", iconClass: "text-red-500", bg: "bg-red-50",
      title: "Ошибка",
      desc: errorMsg || "Не удалось обработать приглашение.",
      action: <Button variant="outline" onClick={() => navigate("/")}>На главную</Button>,
    },
    loading: { icon: "Loader2", iconClass: "", bg: "", title: "", desc: "" },
    verifying: { icon: "Loader2", iconClass: "", bg: "", title: "", desc: "" },
  };

  const c = content[state];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <Icon name="ArrowLeft" size={16} />
            На сайт
          </Link>
        </div>
        <div className={`rounded-2xl p-8 text-center space-y-4 ${c.bg} border`}>
          <div className="flex justify-center">
            <Icon name={c.icon as "CheckCircle2"} size={48} className={c.iconClass} />
          </div>
          <h1 className="text-xl font-bold">{c.title}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{c.desc}</p>
          {c.action && <div className="pt-2">{c.action}</div>}
        </div>
      </div>
    </div>
  );
}
