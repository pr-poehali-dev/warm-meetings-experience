import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import BlogHeader from "@/components/blog/BlogHeader";
import BlogCard from "@/components/blog/BlogCard";
import CategoryFilter from "@/components/blog/CategoryFilter";
import Footer from "@/components/Footer";
import { categories } from "@/lib/blog-data";
import { blogApi, ApiBlogArticle } from "@/lib/blog-api";

export default function Blog() {
  const [articles, setArticles] = useState<ApiBlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    blogApi
      .getAll()
      .then((d) => setArticles(d.articles))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      selectedCategory
        ? articles.filter((a) => a.category === selectedCategory)
        : articles,
    [articles, selectedCategory]
  );

  const popularArticles = articles.filter((a) => a.popular);
  const featuredArticle = filtered[0];
  const restArticles = filtered.slice(1);

  const countByCategory = (slug: string) =>
    articles.filter((a) => a.category === slug).length;

  return (
    <div className="min-h-screen bg-background">
      <BlogHeader />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              Банная энциклопедия
            </h2>
            <p className="text-lg text-muted-foreground">
              Полезные статьи о бане — ритуалы, здоровье, стройка и история.
              Всё, что нужно знать ценителю настоящей бани.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                to={`/blog/category/${cat.slug}`}
                className="group flex items-center gap-3 p-4 border border-border hover:border-foreground/20 transition-colors"
              >
                <div
                  className={`w-10 h-10 flex items-center justify-center ${cat.color}`}
                >
                  <Icon name={cat.icon} size={20} />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm group-hover:text-muted-foreground transition-colors">
                    {cat.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {countByCategory(cat.slug)} статей
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mb-8">
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>

          {loading ? (
            <div className="text-center py-20">
              <Icon
                name="Loader2"
                size={32}
                className="animate-spin text-muted-foreground mx-auto mb-4"
              />
              <p className="text-muted-foreground">Загрузка статей...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Icon
                name="FileText"
                size={48}
                className="text-muted-foreground/40 mx-auto mb-4"
              />
              <p className="text-muted-foreground text-lg">Статей пока нет</p>
            </div>
          ) : (
            <>
              {featuredArticle && !selectedCategory && (
                <div className="mb-8">
                  <BlogCard article={featuredArticle} featured />
                </div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                {(selectedCategory ? filtered : restArticles).map((article) => (
                  <BlogCard key={article.slug} article={article} />
                ))}
              </div>

              {!selectedCategory && popularArticles.length > 0 && (
                <section className="border-t border-border pt-12">
                  <div className="flex items-center gap-2 mb-8">
                    <Icon
                      name="TrendingUp"
                      size={20}
                      className="text-muted-foreground"
                    />
                    <h2 className="text-2xl font-semibold">
                      Популярные материалы
                    </h2>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {popularArticles.map((article) => (
                      <BlogCard key={article.slug} article={article} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
