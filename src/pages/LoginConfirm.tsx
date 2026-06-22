import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { userAuthApi2FA } from "@/lib/user-api";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginConfirm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Ссылка недействительна");
      return;
    }
    userAuthApi2FA.loginVerifyLink(token)
      .then((res) => {
        loginWithToken(res.token, res.user);
        setStatus("success");
        setTimeout(() => navigate("/account", { replace: true }), 800);
      })
      .catch((e) => {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Ссылка недействительна или устарела");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-sm">
        <CardContent className="p-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Icon name="Loader2" size={40} className="animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Выполняем вход...</p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto">
                <Icon name="CheckCircle" size={32} className="text-green-600" />
              </div>
              <h1 className="text-xl font-semibold">Вход выполнен</h1>
              <p className="text-muted-foreground text-sm">Переходим в личный кабинет...</p>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto">
                <Icon name="XCircle" size={32} className="text-red-500" />
              </div>
              <h1 className="text-xl font-semibold">Не удалось войти</h1>
              <p className="text-muted-foreground text-sm">{message}</p>
              <Link
                to="/login"
                className="inline-block mt-2 text-sm text-primary underline underline-offset-2"
              >
                Войти заново
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
