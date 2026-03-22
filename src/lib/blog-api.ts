import { request, authenticatedRequest } from "@/lib/http";

const BLOG_API = "https://functions.poehali.dev/c4b3bf91-237b-43c6-be59-4e02e3f0a63e";

export interface ApiBlogArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  image_url: string;
  author_id: number;
  author_name: string;
  status: "draft" | "pending" | "published" | "rejected";
  reject_reason?: string;
  read_time: number;
  popular: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateArticleData {
  title: string;
  content: string;
  excerpt: string;
  category: string;
  image_url?: string;
  read_time?: number;
}

export const blogApi = {
  getAll: (category?: string): Promise<{ articles: ApiBlogArticle[] }> =>
    request(`${BLOG_API}/${category ? `?category=${category}` : ""}`),

  getBySlug: (slug: string): Promise<{ article: ApiBlogArticle }> =>
    request(`${BLOG_API}/?slug=${encodeURIComponent(slug)}`),

  getMy: (): Promise<{ articles: ApiBlogArticle[] }> =>
    authenticatedRequest(`${BLOG_API}/?action=my`),

  getAdmin: (status?: string): Promise<{ articles: ApiBlogArticle[] }> =>
    authenticatedRequest(
      `${BLOG_API}/?action=admin${status ? `&status=${status}` : ""}`
    ),

  create: (
    data: CreateArticleData
  ): Promise<{ article: ApiBlogArticle; status: string }> =>
    authenticatedRequest(`${BLOG_API}/?action=create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  update: (
    id: number,
    data: Partial<CreateArticleData> & { popular?: boolean; publish?: boolean }
  ): Promise<{ article: ApiBlogArticle }> =>
    authenticatedRequest(`${BLOG_API}/?action=update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    }),

  moderate: (
    id: number,
    decision: "approve" | "reject",
    reject_reason?: string
  ): Promise<{ article: ApiBlogArticle }> =>
    authenticatedRequest(`${BLOG_API}/?action=moderate`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision, reject_reason }),
    }),

  setPopular: (
    id: number,
    popular: boolean
  ): Promise<{ article: ApiBlogArticle }> =>
    authenticatedRequest(`${BLOG_API}/?action=set-popular`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, popular }),
    }),
};
