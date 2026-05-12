import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

const NotFoundPage = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-[#1a1714] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-md border border-amber-200 dark:border-amber-900/40">
              <img
                src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/04067879-52cd-41cd-abff-341917939bcb.jpg"
                alt="Пустая шайка"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/40 flex items-center justify-center text-lg shadow-sm">
              ❓
            </div>
          </div>
        </div>

        <div className="font-black text-[88px] leading-none tracking-tight text-amber-200 dark:text-amber-900/60 select-none mb-2">
          404
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Шайка пустая
        </h1>

        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          Страница, которую вы ищете, куда-то испарилась — как пар в&nbsp;открытую дверь.
          Возможно, ссылка устарела или адрес введён с&nbsp;ошибкой.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="rounded-xl">
            <Link to="/">
              <Icon name="Home" size={16} className="mr-2" />
              На главную
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-xl">
            <Link to="/events">
              <Icon name="Flame" size={16} className="mr-2" />
              Смотреть события
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/60">
          Если вы уверены, что страница должна быть — напишите в{" "}
          <button
            onClick={() => document.querySelector<HTMLButtonElement>("[data-support-toggle]")?.click()}
            className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
          >
            службу поддержки
          </button>
          .
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400/0 via-amber-400/40 to-amber-400/0 pointer-events-none" />
    </div>
  );
};

export default NotFoundPage;