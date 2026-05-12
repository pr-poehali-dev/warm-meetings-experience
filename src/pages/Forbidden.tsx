import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

interface ForbiddenProps {
  requiredRole?: string | string[];
}

const Forbidden = ({ requiredRole }: ForbiddenProps) => {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-[#1a1714] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-rose-100 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center text-5xl shadow-sm">
              🔒
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 flex items-center justify-center text-lg">
              🔥
            </div>
          </div>
        </div>

        <div className="font-black text-[88px] leading-none tracking-tight text-rose-200 dark:text-rose-900/50 select-none mb-2">
          403
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Вход закрыт
        </h1>

        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          В эту парную вас не пустят — недостаточно прав для просмотра этой страницы.
        </p>

        {requiredRole && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-medium mb-6">
            <Icon name="ShieldCheck" size={13} />
            Требуется роль: {Array.isArray(requiredRole) ? requiredRole.join(", ") : requiredRole}
          </div>
        )}

        <div className={`flex flex-col sm:flex-row gap-3 justify-center ${requiredRole ? "" : "mt-8"}`}>
          <Button asChild size="lg" className="rounded-xl">
            <Link to="/">
              <Icon name="Home" size={16} className="mr-2" />
              На главную
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-xl">
            <Link to="/account">
              <Icon name="User" size={16} className="mr-2" />
              Личный кабинет
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/60">
          Считаете, что доступ должен быть? Напишите в{" "}
          <button
            onClick={() => document.querySelector<HTMLButtonElement>("[data-support-toggle]")?.click()}
            className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
          >
            службу поддержки
          </button>
          .
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400/0 via-rose-400/30 to-rose-400/0 pointer-events-none" />
    </div>
  );
};

export default Forbidden;
