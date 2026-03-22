import { BlogArticle } from "@/lib/blog-data";
import BlogCard from "./BlogCard";

interface RelatedArticlesProps {
  articles: BlogArticle[];
}

export default function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <section className="border-t border-border pt-12 mt-12">
      <h2 className="text-2xl font-semibold mb-8">Читайте также</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <BlogCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}
