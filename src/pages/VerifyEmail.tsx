import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { userProfileApi } from "@/lib/user-api";
import { useAuth } from "@/contexts/AuthContext";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { updateUser, user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Токен не найден");
      return;
    }
    userProfileApi.verifyEmail(token)
      .then(() => {
        setStatus("success");
        if (user) updateUser({ ...user, email_verified: true });
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
              <p className="text-muted-foreground">Подтверждаем email...</p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto">
                <Icon name="CheckCircle" size={32} className="text-green-600" />
              </div>
              <h1 className="text-xl font-semibold">Email подтверждён</h1>
              <p className="text-muted-foreground text-sm">Ваш адрес электронной почты успешно подтверждён.</p>
              <Link
                to="/account"
                className="inline-block mt-2 bg-foreground text-background px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Перейти в личный кабинет
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto">
                <Icon name="XCircle" size={32} className="text-red-500" />
              </div>
              <h1 className="text-xl font-semibold">Не удалось подтвердить</h1>
              <p className="text-muted-foreground text-sm">{message}</p>
              <Link
                to="/account"
                className="inline-block mt-2 text-sm text-primary underline underline-offset-2"
              >
                Вернуться в личный кабинет
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
