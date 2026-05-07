import { authenticatedRequest } from "@/lib/http";
import func2url from "../../backend/func2url.json";

const TG_BOT_URL = func2url["telegram-bot"];
const BLOG_API_URL = func2url["blog-articles"];

export type ContentType = "event" | "master_service" | "bath" | "article";

export interface TgChannel {
  id: number;
  chat_id: number;
  chat_title: string;
  chat_type: string;
  include_photo: boolean;
  content_types: string[];
  auto_publish: boolean;
  channel_type: string;
}

export interface PublishResult {
  ok: boolean;
  published: number;
  errors: { channel: string; error: string }[];
  reason?: string;
}

export const tgPublishApi = {
  getChannels: async (userId: number): Promise<TgChannel[]> => {
    const res = await fetch(TG_BOT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_channels", user_id: userId }),
    });
    const data = await res.json();
    return data.channels || [];
  },

  publishContent: async (params: {
    contentType: ContentType;
    contentId: number;
    userId: number;
    channelIds?: number[];
    publicationType?: "manual" | "auto" | "repeat";
    allowRepeat?: boolean;
    scheduledAt?: string;
    publishedBy?: number;
  }): Promise<PublishResult> => {
    const res = await fetch(TG_BOT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish_content",
        content_type: params.contentType,
        content_id: params.contentId,
        user_id: params.userId,
        channel_ids: params.channelIds,
        publication_type: params.publicationType || "manual",
        allow_repeat: params.allowRepeat || false,
        scheduled_at: params.scheduledAt || null,
        published_by: params.publishedBy || params.userId,
      }),
    });
    return res.json();
  },

  publishArticle: async (params: {
    articleId: number;
    channelIds?: number[];
    allowRepeat?: boolean;
    scheduledAt?: string;
  }): Promise<PublishResult> =>
    authenticatedRequest(`${BLOG_API_URL}/?action=publish-tg`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        article_id: params.articleId,
        channel_ids: params.channelIds,
        allow_repeat: params.allowRepeat || false,
        scheduled_at: params.scheduledAt || null,
      }),
    }) as Promise<PublishResult>,
};
