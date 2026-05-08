import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import Icon from "@/components/ui/icon";
import { initYandexMetrika } from "@/lib/metrika";
import { toast } from "sonner";

const STORAGE_KEY = "cookie-consent-v1";

export default function CookiePreferences() {
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    try {
      const choice = localStorage.getItem(STORAGE_KEY);
      setAnalytics(choice === "all");
    } catch {
      setAnalytics(false);
    }
  }, []);

  const handleChange = (next: boolean) => {
    setAnalytics(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "all" : "necessary");
    } catch {
      // ignore
    }
    if (next) {
      initYandexMetrika();
      toast.success("Аналитические cookies включены");
    } else {
      toast.success("Аналитика выключена. Изменения вступят в силу после перезагрузки страницы");
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon name="Cookie" size={16} className="text-amber-600" />
          Cookies и аналитика
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        <div className="flex items-start justify-between gap-3 py-2 border-b border-border">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">Необходимые</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Нужны для входа, сохранения событий и настроек. Их нельзя отключить.
            </div>
          </div>
          <Switch checked disabled />
        </div>

        <div className="flex items-start justify-between gap-3 py-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">Аналитические</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Помогают нам понимать, как улучшать сайт (Яндекс.Метрика).
            </div>
          </div>
          <Switch checked={analytics} onCheckedChange={handleChange} />
        </div>

        <p className="text-[11px] text-muted-foreground pt-1">
          Решение сохраняется в этом браузере. Можно изменить в любой момент.
        </p>
      </CardContent>
    </Card>
  );
}
