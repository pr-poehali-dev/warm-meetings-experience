import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { ApiBlogArticle, blogApi } from "@/lib/blog-api";
import ArticleEditor from "@/components/blog/ArticleEditor";
import { getCategoryBySlug } from "@/lib/blog-data";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: "Черновик",        color: "text-muted-foreground bg-muted" },
  pending:   { label: "На модерации",    color: "text-amber-700 bg-amber-100" },
  published: { label: "Опубликовано",    color: "text-green-700 bg-green-100" },
  rejected:  { label: "Отклонено",       color: "text-red-700 bg-red-100" },
};

export default function MyArticles() {
  const [articles, setArticles] = useState<ApiBlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ApiBlogArticle | null | "new">(null);

  const load = useCallback(() => {
    setLoading(true);
    blogApi
      .getMy()
      .then((d) => setArticles(d.articles))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = () => {
    setEditing(null);
    load();
  };

  if (editing !== null) {
    return (
      <div>
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <Icon name="ArrowLeft" size={16} />
          Назад к статьям
        </button>
        <h3 className="text-lg font-semibold mb-6">
          {editing === "new" ? "Новая статья" : "Редактировать статью"}
        </h3>
        <ArticleEditor
          article={editing === "new" ? undefined : editing}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Мои статьи</h3>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Icon name="Plus" size={16} className="mr-2" />
          Написать статью
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground mx-auto" />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border">
          <Icon name="FileText" size={40} className="text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Вы ещё не написали ни одной статьи</p>
          <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
            Написать первую статью
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => {
            const cat = getCategoryBySlug(a.category);
            const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.draft;
            return (
              <div
                key={a.id}
                className="flex items-start gap-4 p-4 border border-border"
              >
                {a.image_url && (
                  <div className="w-16 h-12 shrink-0 overflow-hidden bg-muted">
                    <img src={a.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 ${st.color}`}>
                      {st.label}
                    </span>
                    {cat && (
                      <span className={`text-xs px-2 py-0.5 ${cat.color}`}>{cat.name}</span>
                    )}
                  </div>
                  <div className="font-medium text-sm line-clamp-1">{a.title}</div>
                  {a.status === "rejected" && a.reject_reason && (
                    <p className="text-xs text-red-600 mt-1">
                      Причина: {a.reject_reason}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(a)}
                  className="shrink-0"
                >
                  <Icon name="Pencil" size={14} />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
