import { useState, useEffect, useCallback } from "react";
import { partnerApi, PartnerBath } from "@/lib/partner-api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import BathCard from "@/components/partner/BathCard";
import BathForm from "@/components/partner/BathForm";
import PartnerStats from "@/components/partner/PartnerStats";
import CabinetHeader from "@/components/CabinetHeader";

type View = "dashboard" | "baths" | "add" | "edit";

export default function PartnerCabinet() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const [baths, setBaths] = useState<PartnerBath[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBath, setEditingBath] = useState<PartnerBath | null>(null);

  const loadBaths = useCallback(() => {
    setLoading(true);
    partnerApi.listBaths()
      .then((d) => setBaths(d.baths))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBaths();
  }, [loadBaths]);

  const handleEdit = (bath: PartnerBath) => {
    setEditingBath(bath);
    setView("edit");
  };

  const handleSaved = () => {
    loadBaths();
    setView("baths");
    setEditingBath(null);
  };

  const handleCancel = () => {
    setView(editingBath ? "baths" : "baths");
    setEditingBath(null);
  };

  const navItems = [
    { id: "dashboard", label: "Обзор", icon: "LayoutDashboard" },
    { id: "baths", label: "Мои бани", icon: "Building2" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Шапка */}
      <CabinetHeader
        icon="Building2"
        title="Партнёрский кабинет"
        iconBgClass="bg-violet-100"
        iconColorClass="text-violet-600"
        onLogout={logout}
      />

      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-5xl">
        <div className="flex gap-6">
          {/* Боковая навигация */}
          <aside className="hidden md:block w-48 flex-shrink-0">
            <nav className="space-y-1 sticky top-20">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id as View); setEditingBath(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    view === item.id
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </button>
              ))}
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => { setView("add"); setEditingBath(null); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-primary hover:bg-primary/5 transition-colors"
                >
                  <Icon name="Plus" size={16} />
                  Добавить баню
                </button>
              </div>
            </nav>
          </aside>

          {/* Мобильная навигация */}
          <div className="md:hidden w-full mb-4">
            <div className="flex gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id as View); setEditingBath(null); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                    view === item.id
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon name={item.icon} size={14} />
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => { setView("add"); setEditingBath(null); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-primary hover:bg-primary/5"
              >
                <Icon name="Plus" size={14} />
                Добавить
              </button>
            </div>
          </div>

          {/* Основной контент */}
          <main className="flex-1 min-w-0 space-y-4">
            {/* DASHBOARD */}
            {view === "dashboard" && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-foreground">Добрый день, {user?.name?.split(" ")[0]}!</h1>
                    <p className="text-sm text-muted-foreground">Партнёрский кабинет</p>
                  </div>
                  <Button size="sm" onClick={() => setView("add")} className="gap-1.5">
                    <Icon name="Plus" size={14} />
                    Добавить баню
                  </Button>
                </div>

                <PartnerStats />

                {/* Быстрый доступ к баням */}
                {baths.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-sm font-semibold text-foreground">Мои бани</h2>
                      <button onClick={() => setView("baths")} className="text-xs text-primary hover:underline">Все бани</button>
                    </div>
                    <div className="space-y-2">
                      {baths.slice(0, 3).map((bath) => (
                        <BathCard key={bath.id} bath={bath} onEdit={handleEdit} onChanged={loadBaths} />
                      ))}
                    </div>
                  </div>
                )}

                {baths.length === 0 && !loading && (
                  <Card className="border-0 shadow-sm border-dashed">
                    <CardContent className="p-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
                        <Icon name="Building2" size={24} className="text-violet-400" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-1">Добавьте первую баню</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Зарегистрируйте свою баню в каталоге, чтобы клиенты могли найти вас
                      </p>
                      <Button onClick={() => setView("add")} className="gap-2">
                        <Icon name="Plus" size={15} />
                        Добавить баню
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Подсказки */}
                <Card className="border-0 shadow-sm bg-violet-50/50">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Icon name="Lightbulb" size={15} className="text-violet-500" />
                      Советы для партнёра
                    </h3>
                    <ul className="space-y-1.5">
                      {[
                        "Добавьте фотографии бани — это увеличивает просмотры в 3 раза",
                        "Запросите верификацию, чтобы получить значок проверенного заведения",
                        "Укажите точный адрес и телефон для удобства клиентов",
                      ].map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <div className="w-1 h-1 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </>
            )}

            {/* МОИ БАНИ */}
            {view === "baths" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Мои бани</h2>
                  <Button size="sm" onClick={() => setView("add")} className="gap-1.5">
                    <Icon name="Plus" size={14} />
                    Добавить
                  </Button>
                </div>

                {loading && (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="border-0 shadow-sm">
                        <CardContent className="p-3 h-24 flex gap-3">
                          <div className="w-24 h-full bg-muted rounded-lg animate-pulse flex-shrink-0" />
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-muted rounded animate-pulse" />
                            <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {!loading && baths.length === 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-8 text-center">
                      <Icon name="Building2" size={32} className="text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Нет добавленных бань</p>
                      <Button size="sm" className="mt-3 gap-1.5" onClick={() => setView("add")}>
                        <Icon name="Plus" size={14} />
                        Добавить первую баню
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {!loading && baths.length > 0 && (
                  <div className="space-y-2">
                    {baths.map((bath) => (
                      <BathCard key={bath.id} bath={bath} onEdit={handleEdit} onChanged={loadBaths} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ДОБАВЛЕНИЕ */}
            {view === "add" && (
              <BathForm onSaved={handleSaved} onCancel={handleCancel} />
            )}

            {/* РЕДАКТИРОВАНИЕ */}
            {view === "edit" && editingBath && (
              <BathForm bath={editingBath} onSaved={handleSaved} onCancel={handleCancel} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}