import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { userAuthApi } from "@/lib/user-api";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await userAuthApi.forgot(email);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link
            to="/login"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="ArrowLeft" size={20} />
            <span className="text-sm font-medium">Назад</span>
          </Link>
          <h1 className="text-lg font-semibold">Восстановление пароля</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 flex justify-center">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <Icon name="MailCheck" size={24} className="text-green-600" />
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Если аккаунт существует, на указанный email отправлена ссылка для сброса пароля
                </p>
                <Link
                  to="/login"
                  className="inline-block text-sm text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
                >
                  Вернуться ко входу
                </Link>
              </div>
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

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                        Отправка...
                      </>
                    ) : (
                      "Отправить ссылку для сброса"
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