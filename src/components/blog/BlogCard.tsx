import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { BlogArticle, getCategoryBySlug } from "@/lib/blog-data";

interface BlogCardProps {
  article: BlogArticle;
  featured?: boolean;
}

export default function BlogCard({ article, featured }: BlogCardProps) {
  const category = getCategoryBySlug(article.category);

  if (featured) {
    return (
      <Link
        to={`/blog/${article.slug}`}
        className="group block overflow-hidden border border-border hover:border-foreground/20 transition-colors"
      >
        <div className="grid md:grid-cols-2">
          <div className="aspect-[4/3] md:aspect-auto overflow-hidden">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="p-6 md:p-8 flex flex-col justify-center">
            {category && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 w-fit mb-4 ${category.color}`}>
                <Icon name={category.icon} size={12} />
                {category.name}
              </span>
            )}
            <h3 className="text-xl md:text-2xl font-semibold mb-3 group-hover:text-muted-foreground transition-colors">
              {article.title}
            </h3>
            <p className="text-muted-foreground mb-4 line-clamp-3">
              {article.excerpt}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-auto">
              <span className="flex items-center gap-1.5">
                <Icon name="Clock" size={14} />
                {article.readTime} мин
              </span>
              <span>{formatDate(article.date)}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/blog/${article.slug}`}
      className="group block overflow-hidden border border-border hover:border-foreground/20 transition-colors"
    >
      <div className="aspect-[16/10] overflow-hidden">
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-5">
        {category && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 w-fit mb-3 ${category.color}`}>
            <Icon name={category.icon} size={12} />
            {category.name}
          </span>
        )}
        <h3 className="text-lg font-semibold mb-2 group-hover:text-muted-foreground transition-colors line-clamp-2">
          {article.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {article.excerpt}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Icon name="Clock" size={12} />
            {article.readTime} мин
          </span>
          <span>{formatDate(article.date)}</span>
        </div>
      </div>
    </Link>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
