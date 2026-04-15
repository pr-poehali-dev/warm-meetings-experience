import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PrivacyContent from "./privacy/PrivacyContent";
import TermsContent from "./terms/TermsContent";
import TermsAppendixModal from "./terms/TermsAppendixModal";
import { appendices as termsAppendices } from "./terms/termsAppendices";
import { privacyAppendices } from "./privacy/privacyAppendices";
import { FunctionalContent, FunctionalSidebar } from "./functional/FunctionalContent";

type TabId = "privacy" | "terms" | "functional";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "privacy",    label: "Политика конфиденциальности", icon: "Shield" },
  { id: "terms",      label: "Пользовательское соглашение", icon: "FileText" },
  { id: "functional", label: "Документация на ПО",          icon: "BookOpen" },
];

export default function Documents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "privacy";
  const [activeTab, setActiveTab] = useState<TabId>(
    ["privacy", "terms", "functional"].includes(initialTab) ? initialTab : "privacy"
  );
  const [openTermsAppendix, setOpenTermsAppendix] = useState<number | null>(null);
  const [openPrivacyAppendix, setOpenPrivacyAppendix] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeTermsAppendix = termsAppendices.find((a) => a.id === openTermsAppendix);
  const activePrivacyAppendix = privacyAppendices.find((a) => a.id === openPrivacyAppendix);

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const tab = searchParams.get("tab") as TabId;
    if (tab && ["privacy", "terms", "functional"].includes(tab)) setActiveTab(tab);
  }, [searchParams]);

  const privacyDate = "30 марта 2026 г.";
  const termsDate = "30 марта 2026 г.";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* hero */}
      <div className="bg-muted/40 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <Icon name="ArrowLeft" size={14} />
            На главную
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Юридические документы
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Правила использования сервиса, политика обработки данных и иные документы СПАРКОМ
          </p>
        </div>
      </div>

      {/* tabs bar */}
      <div className="border-b border-border bg-background sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}
              >
                <Icon name={tab.icon as "Shield"} size={15} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* content */}
      <div ref={contentRef} className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeTab === "privacy" && (
          <div className="flex gap-12">
            {/* sidebar */}
            <PrivacySidebar />
            {/* article */}
            <article className="flex-1 min-w-0 max-w-3xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Icon name="Shield" size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Политика конфиденциальности</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Редакция от {privacyDate}</p>
                </div>
              </div>
              <PrivacyContent onOpenAppendix={setOpenPrivacyAppendix} />
            </article>
          </div>
        )}

        {activeTab === "terms" && (
          <div className="flex gap-12">
            {/* sidebar */}
            <TermsSidebar />
            {/* article */}
            <article className="flex-1 min-w-0 max-w-3xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Icon name="FileText" size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Правила сайта и сообщества «СПАРКОМ»</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Пользовательское соглашение + Правила сообщества · версия от {termsDate}
                  </p>
                </div>
              </div>
              <TermsContent onOpenAppendix={setOpenTermsAppendix} />
            </article>
          </div>
        )}

        {activeTab === "functional" && (
          <div className="flex gap-12">
            <FunctionalSidebar />
            <FunctionalContent />
          </div>
        )}
      </div>

      <Footer />

      {/* modals */}
      {openTermsAppendix !== null && activeTermsAppendix && (
        <TermsAppendixModal
          appendix={activeTermsAppendix}
          onClose={() => setOpenTermsAppendix(null)}
        />
      )}
      {openPrivacyAppendix !== null && activePrivacyAppendix && (
        <TermsAppendixModal
          appendix={activePrivacyAppendix}
          onClose={() => setOpenPrivacyAppendix(null)}
        />
      )}
    </div>
  );
}

// ── Privacy sidebar с якорной навигацией ──────────────────────────────────────
const PRIVACY_SECTIONS = [
  { id: "ps1",  title: "Общие положения" },
  { id: "ps2",  title: "Основные понятия" },
  { id: "ps3",  title: "Права Оператора" },
  { id: "ps4",  title: "Права субъектов данных" },
  { id: "ps5",  title: "Цели сбора и обработки" },
  { id: "ps6",  title: "Передача третьим лицам" },
  { id: "ps7",  title: "Простая электронная подпись" },
  { id: "ps8",  title: "Условия обработки" },
  { id: "ps9",  title: "Безопасность данных" },
  { id: "ps10", title: "Права на информацию" },
  { id: "ps11", title: "Несовершеннолетние" },
  { id: "ps12", title: "Трансграничная передача" },
  { id: "ps13", title: "Изменение Политики" },
  { id: "ps14", title: "Заключительные положения" },
  { id: "ps15", title: "Контакты" },
];

function useSidebarActive(sections: { id: string }[], offset = 130) {
  const [activeId, setActiveId] = useState(sections[0].id);

  useEffect(() => {
    const getActive = () => {
      let current = sections[0].id;
      for (const { id } of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= offset) current = id;
        else break;
      }
      return current;
    };
    const onScroll = () => setActiveId(getActive());
    setActiveId(getActive());
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections, offset]);

  return activeId;
}

function handleSidebarClick(id: string, offset = 112) {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
}

function PrivacySidebar() {
  const activeId = useSidebarActive(PRIVACY_SECTIONS);

  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Содержание</p>
        <nav className="space-y-0.5">
          {PRIVACY_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSidebarClick(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors leading-snug
                ${activeId === s.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
            >
              {s.title}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

// ── Terms sidebar ──────────────────────────────────────────────────────────────
const TERMS_SECTIONS = [
  { id: "part1", title: "Часть I. Общие положения" },
  { id: "part2", title: "Часть II. Регистрация и верификация" },
  { id: "part3", title: "Часть III. Правила сообщества" },
  { id: "part4", title: "Часть IV. Мероприятия" },
  { id: "part5", title: "Часть V. Финансы" },
  { id: "part6", title: "Часть VI. Ответственность" },
  { id: "part7", title: "Часть VII. Интеллектуальная собственность" },
  { id: "part8", title: "Часть VIII. Заключительные положения" },
];

function TermsSidebar() {
  const activeId = useSidebarActive(TERMS_SECTIONS);

  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Содержание</p>
        <nav className="space-y-0.5">
          {TERMS_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSidebarClick(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors leading-snug
                ${activeId === s.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
            >
              {s.title}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}