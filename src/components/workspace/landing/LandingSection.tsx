import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { landingApi, LandingPage } from "@/lib/landing-api";
import LandingSlugTab from "./LandingSlugTab";
import LandingBuilderTab from "./LandingBuilderTab";

export default function LandingSection() {
  const { hasRole } = useAuth();
  const [landing, setLanding] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"slug" | "builder" | "design" | "stats">("slug");

  const isCommercial = hasRole("parmaster") || hasRole("organizer") || hasRole("partner");

  useEffect(() => {
    if (!isCommercial) { setLoading(false); return; }
    landingApi.getMy()
      .then((d) => setLanding(d.landing))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isCommercial]);

  if (!isCommercial) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto">
            <Icon name="Globe" size={28} className="text-orange-500" />
          </div>
          <h3 className="font-semibold text-lg">Визитка для партнёров</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Персональный мини-сайт доступен после верификации в одной из ролей: мастер, организатор или партнёр.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Icon name="Globe" size={20} className="text-orange-500" /> Моя визитка</h2>
          {landing?.slug && (
            <a
              href={`/${landing.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-0.5"
            >
              {window.location.host}/{landing.slug}
              <Icon name="ExternalLink" size={12} />
            </a>
          )}
        </div>
        {landing?.slug && (
          <Button size="sm" variant="outline" onClick={() => window.open(`/${landing.slug}`, "_blank")} className="gap-1.5">
            <Icon name="Eye" size={14} /> Предпросмотр
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="slug"><Icon name="Link" size={14} className="mr-1.5" /><span className="hidden sm:inline">Адрес</span></TabsTrigger>
          <TabsTrigger value="builder"><Icon name="LayoutList" size={14} className="mr-1.5" /><span className="hidden sm:inline">Конструктор</span></TabsTrigger>
          <TabsTrigger value="design"><Icon name="Palette" size={14} className="mr-1.5" /><span className="hidden sm:inline">Дизайн</span></TabsTrigger>
          <TabsTrigger value="stats"><Icon name="BarChart3" size={14} className="mr-1.5" /><span className="hidden sm:inline">Статистика</span></TabsTrigger>
        </TabsList>

        <TabsContent value="slug" className="mt-4">
          <LandingSlugTab landing={landing} onSaved={setLanding} />
        </TabsContent>
        <TabsContent value="builder" className="mt-4">
          <LandingBuilderTab landing={landing} onSaved={setLanding} />
        </TabsContent>
        <TabsContent value="design" className="mt-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold">Тема оформления</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="border-2 border-orange-500 rounded-xl p-4 cursor-pointer">
                  <div className="h-16 rounded-lg bg-gradient-to-br from-orange-100 to-rose-100 mb-2"></div>
                  <div className="text-sm font-medium">Терракота</div>
                  <div className="text-xs text-orange-600 mt-0.5">Активна</div>
                </div>
                <div className="border-2 border-dashed border-muted rounded-xl p-4 opacity-50">
                  <div className="h-16 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 mb-2"></div>
                  <div className="text-sm font-medium">Тёмная</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Скоро</div>
                </div>
                <div className="border-2 border-dashed border-muted rounded-xl p-4 opacity-50">
                  <div className="h-16 rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 mb-2"></div>
                  <div className="text-sm font-medium">Кремовая</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Скоро</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="stats" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard icon="Eye" label="Просмотров" value={landing?.visits ?? 0} accent="text-blue-500" />
            <StatCard icon="MousePointerClick" label="Кликов «Записаться»" value={landing?.cta_clicks ?? 0} accent="text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">Подробная статистика по дням появится в ближайшее время.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: number; accent: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${accent}`}>
            <Icon name={icon} size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold">{value.toLocaleString("ru-RU")}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
