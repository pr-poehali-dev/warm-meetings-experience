import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { ApiBlogArticle, blogApi } from "@/lib/blog-api";
import { getCategoryBySlug } from "@/lib/blog-data";
import { useToast } from "@/hooks/use-toast";

type FilterStatus = "all" | "pending" | "published" | "rejected" | "draft";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: "Черновик",     color: "text-muted-foreground bg-muted" },
  pending:   { label: "На модерации", color: "text-amber-700 bg-amber-100" },
  published: { label: "Опубликовано", color: "text-green-700 bg-green-100" },
  rejected:  { label: "Отклонено",   color: "text-red-700 bg-red-100" },
};

export default function AdminBlog() {
  const { toast } = useToast();
  const [articles, setArticles] = useState<ApiBlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = useCallback(
    (status: FilterStatus = filter) => {
      setLoading(true);
      blogApi
        .getAdmin(status === "all" ? undefined : status)
        .then((d) => setArticles(d.articles))
        .catch(() => toast({ title: "Ошибка загрузки", variant: "destructive" }))
        .finally(() => setLoading(false));
    },
    [filter, toast]
  );

  useEffect(() => {
    load(filter);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await blogApi.moderate(id, "approve");
      toast({ title: "Статья опубликована" });
      load();
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await blogApi.moderate(rejectModal.id, "reject", rejectReason);
      toast({ title: "Статья отклонена" });
      setRejectModal(null);
      setRejectReason("");
      load();
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePopular = async (id: number, popular: boolean) => {
    setActionLoading(id);
    try {
      await blogApi.setPopular(id, !popular);
      toast({ title: !popular ? "Добавлено в популярные" : "Убрано из популярных" });
      load();
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const FILTERS: { value: FilterStatus; label: string }[] = [
    { value: "pending",   label: "На модерации" },
    { value: "published", label: "Опубликованные" },
    { value: "rejected",  label: "Отклонённые" },
    { value: "draft",     label: "Черновики" },
    { value: "all",       label: "Все" },
  ];

  const pendingCount = articles.filter((a) => a.status === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Управление блогом</h2>
          {pendingCount > 0 && filter !== "pending" && (
            <p className="text-sm text-amber-600 mt-0.5">
              {pendingCount} статей ожидают модерации
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-sm font-medium border transition-colors ${
              filter === f.value
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground mx-auto" />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border">
          <Icon name="FileText" size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Статей нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => {
            const cat = getCategoryBySlug(a.category);
            const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.draft;
            const isLoading = actionLoading === a.id;
            return (
              <div key={a.id} className="border border-border p-4">
                <div className="flex items-start gap-4">
                  {a.image_url && (
                    <div className="w-20 h-14 shrink-0 overflow-hidden bg-muted">
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
                      {a.popular && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700">
                          Популярное
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-sm mb-0.5">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Автор: {a.author_name} · {new Date(a.created_at).toLocaleDateString("ru-RU")}
                    </div>
                    {a.status === "rejected" && a.reject_reason && (
                      <p className="text-xs text-red-600 mt-1">Причина: {a.reject_reason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {a.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(a.id)}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isLoading ? (
                            <Icon name="Loader2" size={14} className="animate-spin" />
                          ) : (
                            <Icon name="Check" size={14} />
                          )}
                          <span className="ml-1.5">Принять</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setRejectModal({ id: a.id }); setRejectReason(""); }}
                          disabled={isLoading}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Icon name="X" size={14} />
                          <span className="ml-1.5">Отклонить</span>
                        </Button>
                      </>
                    )}
                    {a.status === "published" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTogglePopular(a.id, a.popular)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Icon name="Loader2" size={14} className="animate-spin" />
                        ) : (
                          <Icon name={a.popular ? "StarOff" : "Star"} size={14} />
                        )}
                        <span className="ml-1.5">{a.popular ? "Убрать из популярных" : "В популярные"}</span>
                      </Button>
                    )}
                    {(a.status === "published" || a.status === "rejected") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleApprove(a.id)}
                        disabled={isLoading}
                        title={a.status === "rejected" ? "Опубликовать" : "Переопубликовать"}
                      >
                        <Icon name="RefreshCw" size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold mb-4">Причина отклонения</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Укажите причину, чтобы автор мог исправить статью..."
              rows={3}
              className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none mb-4"
            />
            <div className="flex gap-3">
              <Button
                onClick={handleReject}
                disabled={actionLoading !== null}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Отклонить
              </Button>
              <Button variant="outline" onClick={() => setRejectModal(null)}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
