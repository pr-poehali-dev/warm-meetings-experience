import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { categories } from "@/lib/blog-data";
import { blogApi, ApiBlogArticle } from "@/lib/blog-api";
import BathLoader from "@/components/BathLoader";

const HERO_IMG = "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/72e75dca-aed9-4626-aa70-d7c48a5923d1.jpg";

const THEME_STYLES = `
  [data-blog-theme="dark"] {
    --bg-page: linear-gradient(160deg, #1a1410 0%, #1c2018 35%, #14201c 65%, #101818 100%);
    --c-cream: #EDE0CC;
    --c-terra: #C8834A;
    --c-sage:  #8FA89A;
    --c-text:  rgba(217,237,232,0.6);
    --c-muted: rgba(217,237,232,0.45);
    --glass-bg: rgba(237,224,204,0.06);
    --glass-border: rgba(237,224,204,0.13);
    --hero-overlay: linear-gradient(to bottom, rgba(26,20,16,0.3) 0%, rgba(26,20,16,0.55) 50%, #1a1410 90%);
    --hero-img-opacity: 0.2;
    --filter-active-bg: white;
    --filter-active-text: #0f0f0f;
    --filter-idle-bg: rgba(255,255,255,0.08);
    --filter-idle-text: rgba(255,255,255,0.65);
    --filter-idle-border: rgba(255,255,255,0.1);
    --card-bg: rgba(237,224,204,0.05);
    --card-border: rgba(237,224,204,0.1);
    --card-hover: rgba(237,224,204,0.09);
    --badge-bg: rgba(200,131,74,0.15);
    --badge-border: rgba(200,131,74,0.3);
  }
  [data-blog-theme="light"] {
    --bg-page: linear-gradient(160deg, #fdf7f0 0%, #f4f8f5 35%, #eef6f4 65%, #eaf4f2 100%);
    --c-cream: #2d2318;
    --c-terra: #b56b2e;
    --c-sage:  #4a7a6a;
    --c-text:  rgba(35,40,38,0.68);
    --c-muted: rgba(35,40,38,0.5);
    --glass-bg: rgba(255,255,255,0.7);
    --glass-border: rgba(200,131,74,0.15);
    --hero-overlay: linear-gradient(to bottom, rgba(253,247,240,0.15) 0%, rgba(253,247,240,0.5) 50%, #fdf7f0 90%);
    --hero-img-opacity: 0.16;
    --filter-active-bg: #2d2318;
    --filter-active-text: #fff;
    --filter-idle-bg: rgba(45,35,24,0.06);
    --filter-idle-text: rgba(45,35,24,0.65);
    --filter-idle-border: rgba(45,35,24,0.12);
    --card-bg: rgba(255,255,255,0.8);
    --card-border: rgba(200,131,74,0.15);
    --card-hover: rgba(200,131,74,0.07);
    --badge-bg: rgba(181,107,46,0.12);
    --badge-border: rgba(181,107,46,0.25);
  }
`;

const glassCard: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  backdropFilter: "blur(16px)",
};

const CAT_ICONS: Record<string, string> = {
  rituals: "Flame",
  health: "Heart",
  diy: "Hammer",
  history: "BookOpen",
};

function SectionBadge({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
      style={{ background: "var(--badge-bg)", border: "1px solid var(--badge-border)", color: "var(--c-terra)" }}
    >
      <Icon name={icon as "Flame"} size={13} />
      {children}
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function ArticleCard({ article, featured }: { article: ApiBlogArticle; featured?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const dateStr = article.published_at || article.created_at;
  const cat = categories.find((c) => c.slug === article.category);

  if (featured) {
    return (
      <Link
        to={`/blog/${article.slug}`}
        className="group block rounded-2xl overflow-hidden transition-all duration-300"
        style={{ ...glassCard, boxShadow: hovered ? "0 24px 48px rgba(0,0,0,0.3)" : "none" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="grid md:grid-cols-2">
          <div className="relative h-56 md:h-auto overflow-hidden">
            {article.image_url ? (
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover transition-transform duration-500"
                style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(200,131,74,0.1)" }}>
                <Icon name="BookOpen" size={48} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
              </div>
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 60%, rgba(0,0,0,0.3))" }} />
          </div>
          <div className="p-6 md:p-8 flex flex-col justify-center">
            {cat && (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit mb-4" style={{ background: "rgba(200,131,74,0.15)", color: "var(--c-terra)" }}>
                <Icon name={CAT_ICONS[cat.slug] as "Flame" || "BookOpen"} size={12} />
                {cat.name}
              </div>
            )}
            <h3 className="text-xl md:text-2xl font-bold mb-3 leading-tight" style={{ color: "var(--c-cream)" }}>{article.title}</h3>
            <p className="text-sm mb-4 line-clamp-3 leading-relaxed" style={{ color: "var(--c-text)" }}>{article.excerpt}</p>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--c-muted)" }}>
              <span className="flex items-center gap-1.5"><Icon name="Clock" size={12} />{article.read_time} мин</span>
              <span>{formatDate(dateStr)}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/blog/${article.slug}`}
      className="group block rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        ...glassCard,
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? "0 20px 40px rgba(0,0,0,0.25)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{ transform: hovered ? "scale(1.06)" : "scale(1)" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(200,131,74,0.08)" }}>
            <Icon name="BookOpen" size={36} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)" }} />
        {cat && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(200,131,74,0.8)", color: "#fff", backdropFilter: "blur(4px)" }}>
            <Icon name={CAT_ICONS[cat.slug] as "Flame" || "BookOpen"} size={11} />
            {cat.name}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-base mb-2 line-clamp-2 leading-snug" style={{ color: "var(--c-cream)" }}>{article.title}</h3>
        <p className="text-sm mb-3 line-clamp-2" style={{ color: "var(--c-text)" }}>{article.excerpt}</p>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--c-muted)" }}>
          <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{article.read_time} мин</span>
          <span>{formatDate(dateStr)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function Blog() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  const [articles, setArticles] = useState<ApiBlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    blogApi.getAll().then((d) => setArticles(d.articles)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => selectedCategory ? articles.filter((a) => a.category === selectedCategory) : articles,
    [articles, selectedCategory]
  );

  const featuredArticle = !selectedCategory ? filtered[0] : null;
  const restArticles = featuredArticle ? filtered.slice(1) : filtered;
  const popularArticles = articles.filter((a) => a.popular);

  const countByCategory = (slug: string) => articles.filter((a) => a.category === slug).length;

  return (
    <div
      data-blog-theme={isDark ? "dark" : "light"}
      className="min-h-screen relative overflow-x-hidden transition-colors duration-500"
      style={{ background: "var(--bg-page)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, rgba(200,131,74,0.08) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[5%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[100px]" style={{ background: "radial-gradient(circle, rgba(143,168,154,0.07) 0%, transparent 70%)" }} />
      </div>

      <Header transparent />

      {/* Hero */}
      <section data-hero className="relative overflow-hidden" style={{ minHeight: "58vh" }}>
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" style={{ opacity: "var(--hero-img-opacity)" as unknown as number }} />
          <div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-32 pb-16">
          <SectionBadge icon="BookOpen">Знания о бане</SectionBadge>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-4"
            style={{ background: "linear-gradient(135deg, var(--c-cream) 20%, #C8834A 60%, #8FA89A 90%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Банная энциклопедия
          </h1>
          <p className="text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed" style={{ color: "var(--c-text)" }}>
            Ритуалы, здоровье, история и традиции. Всё, что нужно знать настоящему ценителю бани.
          </p>
          {/* Category pills in hero */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(selectedCategory === cat.slug ? null : cat.slug)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={selectedCategory === cat.slug
                  ? { background: "var(--filter-active-bg)", color: "var(--filter-active-text)" }
                  : { background: "var(--filter-idle-bg)", color: "var(--filter-idle-text)", border: "1px solid var(--filter-idle-border)" }
                }
              >
                <Icon name={CAT_ICONS[cat.slug] as "Flame" || "BookOpen"} size={13} />
                {cat.name}
                <span className="opacity-60">({countByCategory(cat.slug)})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="relative z-10 px-4 sm:px-6 max-w-6xl mx-auto pb-20 pt-10">
        {loading ? (
          <BathLoader fullscreen={false} label="Загрузка статей…" />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--c-muted)" }}>
            <Icon name="FileText" size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">Статей пока нет</p>
            <button onClick={() => setSelectedCategory(null)} className="text-sm underline underline-offset-4" style={{ color: "var(--c-terra)" }}>Показать все</button>
          </div>
        ) : (
          <>
            {featuredArticle && (
              <div className="mb-6">
                <ArticleCard article={featuredArticle} featured />
              </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
              {restArticles.map((a) => <ArticleCard key={a.slug} article={a} />)}
            </div>

            {!selectedCategory && popularArticles.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1" style={{ background: "var(--glass-border)" }} />
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--c-terra)" }}>
                    <Icon name="TrendingUp" size={16} />
                    Популярные материалы
                  </div>
                  <div className="h-px flex-1" style={{ background: "var(--glass-border)" }} />
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {popularArticles.map((a) => <ArticleCard key={a.slug} article={a} />)}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}