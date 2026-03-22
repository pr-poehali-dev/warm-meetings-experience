import { useParams, Navigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import BlogHeader from "@/components/blog/BlogHeader";
import BlogCard from "@/components/blog/BlogCard";
import Footer from "@/components/Footer";
import { getCategoryBySlug, getArticlesByCategory, categories } from "@/lib/blog-data";
import { Link } from "react-router-dom";

export default function BlogCategory() {
  const { slug } = useParams<{ slug: string }>();
  const category = slug ? getCategoryBySlug(slug) : undefined;
  const categoryArticles = slug ? getArticlesByCategory(slug) : [];

  if (!category) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen bg-background">
      <BlogHeader title={category.name} backTo="/blog" backLabel="Энциклопедия" />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <div className={`w-12 h-12 flex items-center justify-center ${category.color}`}>
              <Icon name={category.icon} size={24} />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-semibold">{category.name}</h2>
              <p className="text-muted-foreground mt-1">{category.description}</p>
            </div>
          </div>

          {categoryArticles.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {categoryArticles.map((article) => (
                <BlogCard key={article.slug} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Icon name="FileText" size={48} className="text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">
                Статей в этой категории пока нет
              </p>
              <Link
                to="/blog"
                className="text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
              >
                Вернуться к энциклопедии
              </Link>
            </div>
          )}

          <section className="border-t border-border pt-10">
            <h3 className="text-lg font-semibold mb-5">Другие категории</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories
                .filter((c) => c.slug !== slug)
                .map((cat) => (
                  <Link
                    key={cat.slug}
                    to={`/blog/category/${cat.slug}`}
                    className="group flex items-center gap-3 p-4 border border-border hover:border-foreground/20 transition-colors"
                  >
                    <div className={`w-9 h-9 flex items-center justify-center ${cat.color}`}>
                      <Icon name={cat.icon} size={18} />
                    </div>
                    <span className="font-medium text-sm group-hover:text-muted-foreground transition-colors">
                      {cat.name}
                    </span>
                  </Link>
                ))}
            </div>
          </section>
        </div>
      </section>

      <Footer />
    </div>
  );
}
