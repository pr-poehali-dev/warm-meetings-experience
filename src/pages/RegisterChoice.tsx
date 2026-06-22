import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";

type Step = "type" | "specialist";

export default function RegisterChoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("type");

  // signup_roles — список slug'ов ролей, которые выдаются сразу при регистрации
  const goToForm = (signupRoles: string[]) => {
    const params = new URLSearchParams(searchParams);
    params.set("role", signupRoles.length ? "specialist" : "guest");
    params.delete("signup_roles");
    signupRoles.forEach((r) => params.append("signup_roles", r));
    navigate(`/register/form?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          {step === "type" ? (
            <Link
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="ArrowLeft" size={20} />
              <span className="text-sm font-medium">Назад</span>
            </Link>
          ) : (
            <button
              onClick={() => setStep("type")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="ArrowLeft" size={20} />
              <span className="text-sm font-medium">Назад</span>
            </button>
          )}
          <h1 className="text-lg font-semibold">Регистрация</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 flex flex-col items-center">
        <div className="w-full max-w-lg">
          {step === "type" ? (
            <>
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Вы хотите ходить в баню<br />или принимать гостей?
                </h2>
                <p className="text-muted-foreground text-sm">Выберите, чтобы мы настроили всё под вас</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => goToForm([])}
                  className="group relative flex flex-col items-center text-center gap-4 p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-200">
                    🛁
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Хочу в баню</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Записываюсь к мастерам, хожу на мероприятия
                    </p>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon name="ArrowRight" size={18} className="text-primary" />
                  </div>
                </button>

                <button
                  onClick={() => setStep("specialist")}
                  className="group relative flex flex-col items-center text-center gap-4 p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-200">
                    🔥
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Принимаю гостей</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Парю, провожу мероприятия или предоставляю баню
                    </p>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon name="ArrowRight" size={18} className="text-primary" />
                  </div>
                </button>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-8">
                Уже есть аккаунт?{" "}
                <Link to="/login" className="text-primary hover:text-primary/80 font-medium">
                  Войти
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Кем вы будете?</h2>
                <p className="text-muted-foreground text-sm">
                  Доступ откроется сразу — профиль и публикации проходят проверку модератора
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => goToForm(["parmaster", "organizer"])}
                  className="group relative w-full flex items-center text-left gap-4 p-6 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  <div className="w-14 h-14 shrink-0 rounded-full bg-orange-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-200">
                    🔥
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold">Мастер и организатор</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Провожу парения, веду расписание и создаю мероприятия
                    </p>
                  </div>
                  <Icon name="ArrowRight" size={20} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>

                <button
                  onClick={() => goToForm(["partner"])}
                  className="group relative w-full flex items-center text-left gap-4 p-6 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  <div className="w-14 h-14 shrink-0 rounded-full bg-amber-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-200">
                    🏢
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold">Управляющий</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Предоставляю баню как площадку для событий
                    </p>
                  </div>
                  <Icon name="ArrowRight" size={20} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}