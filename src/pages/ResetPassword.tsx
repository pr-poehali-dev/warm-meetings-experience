import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { userAuthApi } from "@/lib/user-api";
import { toast } from "sonner";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    if (!token) return;
    setSubmitting(true);
    try {
      await userAuthApi.reset(token, password);
      toast.success("Пароль успешно установлен");
      navigate("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сброса пароля");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <h1 className="text-lg font-semibold">Новый пароль</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 flex justify-center">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            {!token ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <Icon name="AlertTriangle" size={24} className="text-red-600" />
                </div>
                <p className="text-muted-foreground">
                  Ссылка для сброса пароля недействительна или отсутствует токен
                </p>
                <Link
                  to="/forgot-password"
                  className="inline-block text-sm text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
                >
                  Запросить новую ссылку
                </Link>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Новый пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Введите новый пароль"
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

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                        Сохранение...
                      </>
                    ) : (
                      "Установить пароль"
                    )}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <Link
                    to="/login"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    Вернуться ко входу
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
