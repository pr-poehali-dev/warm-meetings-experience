import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { ApiBlogArticle, blogApi, CreateArticleData } from "@/lib/blog-api";
import { categories } from "@/lib/blog-data";
import { useToast } from "@/hooks/use-toast";

interface ArticleEditorProps {
  article?: ApiBlogArticle;
  onSaved: () => void;
  onCancel: () => void;
}

export default function ArticleEditor({ article, onSaved, onCancel }: ArticleEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateArticleData>({
    title: article?.title ?? "",
    excerpt: article?.excerpt ?? "",
    content: article?.content ?? "",
    category: article?.category ?? "rituals",
    image_url: article?.image_url ?? "",
    read_time: article?.read_time ?? 5,
  });

  const set = (field: keyof CreateArticleData, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Заполните заголовок и текст статьи", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let result;
      if (article?.id) {
        result = await blogApi.update(article.id, form);
      } else {
        result = await blogApi.create(form);
      }
      const status = "status" in result ? result.status : result.article.status;
      toast({
        title:
          status === "published"
            ? "Статья опубликована"
            : "Статья отправлена на модерацию",
        description:
          status !== "published"
            ? "После проверки администратором она появится на сайте"
            : undefined,
      });
      onSaved();
    } catch (err) {
      toast({
        title: "Ошибка сохранения",
        description: err instanceof Error ? err.message : "Попробуйте ещё раз",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5">Заголовок</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Введите заголовок статьи"
          className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          required
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Категория</label>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Время чтения (мин)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={form.read_time}
            onChange={(e) => set("read_time", Number(e.target.value))}
            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Краткое описание</label>
        <textarea
          value={form.excerpt}
          onChange={(e) => set("excerpt", e.target.value)}
          placeholder="2-3 предложения о чём статья"
          rows={2}
          className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">URL обложки</label>
        <input
          type="url"
          value={form.image_url}
          onChange={(e) => set("image_url", e.target.value)}
          placeholder="https://..."
          className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Текст статьи
          <span className="text-muted-foreground font-normal ml-2 text-xs">
            Поддерживается Markdown: ## Заголовок, **жирный**, - список
          </span>
        </label>
        <textarea
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          placeholder="Напишите текст статьи..."
          rows={14}
          className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-y font-mono"
          required
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Icon name="Loader2" size={14} className="animate-spin mr-2" />}
          {article ? "Сохранить" : "Отправить на публикацию"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
