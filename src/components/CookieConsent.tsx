import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { initYandexMetrika } from "@/lib/metrika";

const STORAGE_KEY = "cookie-consent-v1";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(STORAGE_KEY);
      if (accepted) {
        initYandexMetrika();
      } else {
        const t = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    initYandexMetrika();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Согласие на использование cookies"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto max-w-2xl mx-auto bg-background border border-border shadow-2xl rounded-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 items-center justify-center flex-shrink-0">
            <span className="text-xl" aria-hidden>🍪</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base mb-1">
              <span className="sm:hidden mr-1" aria-hidden>🍪</span>
              Наши куки — не для скуки.
            </div>
            <p className="text-sm text-muted-foreground">
              Мы используем их, чтобы сайт работал нормально:
            </p>
            <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
              <li>— сохранял ваши события,</li>
              <li>— запоминал вход,</li>
              <li>— не терял записи и настройки.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Никакой продажи данных. Только немного технической магии ради хорошего банного опыта.
            </p>
            <div className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1">
              <Link
                to="/documents?tab=privacy"
                className="underline hover:text-foreground transition-colors"
              >
                Политика конфиденциальности
              </Link>
              <Link
                to="/documents?tab=terms"
                className="underline hover:text-foreground transition-colors"
              >
                Пользовательское соглашение
              </Link>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button onClick={accept} className="sm:flex-1">
                <Icon name="Check" size={16} className="mr-1.5" />
                Согласен, поехали
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}