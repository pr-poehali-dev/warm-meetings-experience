import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import BlogHeader from "@/components/blog/BlogHeader";
import RelatedArticles from "@/components/blog/RelatedArticles";
import Footer from "@/components/Footer";
import { getCategoryBySlug } from "@/lib/blog-data";
import { blogApi, ApiBlogArticle } from "@/lib/blog-api";

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ApiBlogArticle | null>(null);
  const [related, setRelated] = useState<ApiBlogArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    blogApi
      .getBySlug(slug)
      .then((d) => {
        setArticle(d.article);
        return blogApi.getAll(d.article.category);
      })
      .then((d) => {
        setRelated(d.articles.filter((a) => a.slug !== slug).slice(0, 3));
      })
      .catch(() => navigate("/blog", { replace: true }))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <BlogHeader title="Статья" backTo="/blog" backLabel="Энциклопедия" />
        <div className="flex items-center justify-center py-32">
          <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!article) return null;

  const category = getCategoryBySlug(article.category);
  const dateStr = article.published_at || article.created_at;
  const date = new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <BlogHeader title="Статья" backTo="/blog" backLabel="Энциклопедия" />

      <article className="py-10 md:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
              {category && (
                <Link
                  to={`/blog/category/${category.slug}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-medium ${category.color} hover:opacity-80 transition-opacity`}
                >
                  <Icon name={category.icon} size={12} />
                  {category.name}
                </Link>
              )}
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Icon name="Clock" size={14} />
                {article.read_time} мин чтения
              </span>
              <span className="text-muted-foreground">{date}</span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="text-lg text-muted-foreground mb-8">{article.excerpt}</p>
            )}

            <div className="flex items-center gap-3 mb-10 pb-8 border-b border-border">
              <div className="w-10 h-10 bg-muted flex items-center justify-center">
                <Icon name="User" size={18} className="text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium text-sm">{article.author_name}</div>
                <div className="text-xs text-muted-foreground">Автор</div>
              </div>
            </div>
          </div>

          {article.image_url && (
            <div className="max-w-4xl mx-auto mb-10">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full aspect-[21/9] object-cover"
              />
            </div>
          )}

          <div className="max-w-3xl mx-auto">
            <div className="prose prose-neutral max-w-none prose-headings:font-semibold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-foreground/80 prose-p:leading-relaxed prose-li:text-foreground/80 prose-strong:text-foreground prose-a:text-foreground prose-a:underline">
              {renderMarkdown(article.content)}
            </div>

            <div className="flex items-center gap-4 mt-12 pt-8 border-t border-border">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="ArrowLeft" size={16} />
                Все статьи
              </Link>
              {category && (
                <Link
                  to={`/blog/category/${category.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name={category.icon} size={14} />
                  {category.name}
                </Link>
              )}
            </div>

            <RelatedArticles articles={related} />
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}

function renderMarkdown(content: string) {
  const blocks = content.split("\n\n");
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("## ")) return <h2 key={i}>{trimmed.slice(3)}</h2>;
    if (trimmed.startsWith("- **") || trimmed.startsWith("- ")) {
      const items = trimmed.split("\n").filter((l) => l.startsWith("- "));
      return (
        <ul key={i}>
          {items.map((item, j) => (
            <li key={j}>{renderInline(item.slice(2))}</li>
          ))}
        </ul>
      );
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split("\n").filter((l) => /^\d+\.\s/.test(l));
      return (
        <ol key={i}>
          {items.map((item, j) => (
            <li key={j}>{renderInline(item.replace(/^\d+\.\s/, ""))}</li>
          ))}
        </ol>
      );
    }
    return <p key={i}>{renderInline(trimmed)}</p>;
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  });
}
