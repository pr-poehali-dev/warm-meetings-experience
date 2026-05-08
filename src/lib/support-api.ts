import func2url from "../../backend/func2url.json";
import { request, authenticatedRequest } from "@/lib/http";

const BASE = (func2url as Record<string, string>).support;

export type FaqItem = {
  id: number;
  role: string;
  question: string;
  answer: string;
  sort_order: number;
};

export type TicketStatus = "open" | "in_progress" | "awaiting_reply" | "closed";
export type TicketPriority = "low" | "medium" | "high";

export type Ticket = {
  id: number;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
};

export type SupportMessage = {
  id: number;
  ticket_id: number;
  author_type: "user" | "admin" | "system";
  message: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  is_system: boolean;
  created_at: string;
};

export type AttachmentInfo = {
  url: string;
  filename: string;
  mime: string;
  size: number;
};

export const SUPPORT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const SUPPORT_ALLOWED_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "application/pdf",
  "text/plain",
];

export const supportApi = {
  async fetchFaq(role?: string): Promise<FaqItem[]> {
    const url = `${BASE}?resource=faq${role ? `&role=${encodeURIComponent(role)}` : ""}`;
    const data = await request(url);
    return data.faq || [];
  },

  async uploadAttachment(file: File): Promise<AttachmentInfo> {
    const b64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
      reader.readAsDataURL(file);
    });
    const token = localStorage.getItem("user_token") || "";
    const adminToken = localStorage.getItem("admin_token") || "";
    const res = await fetch(`${BASE}?resource=upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminToken ? { "X-Admin-Token": adminToken } : {}),
        ...(token ? { "X-Session-Token": token } : {}),
      },
      body: JSON.stringify({ file: b64, filename: file.name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Не удалось загрузить файл");
    return data as AttachmentInfo;
  },

  async createTicket(payload: {
    name: string;
    email: string;
    subject: string;
    category: string;
    message: string;
    captcha_ok?: boolean;
    priority?: TicketPriority;
    attachment_url?: string | null;
    attachment_name?: string | null;
  }): Promise<Ticket> {
    const token = localStorage.getItem("user_token") || "";
    const res = await fetch(`${BASE}?resource=ticket`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-Session-Token": token } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Не удалось отправить обращение");
    return data.ticket;
  },

  async listMyTickets(): Promise<Ticket[]> {
    const data = await authenticatedRequest(`${BASE}?resource=tickets`);
    return data.tickets || [];
  },

  async getTicket(id: number): Promise<{ ticket: Ticket; messages: SupportMessage[] }> {
    return authenticatedRequest(`${BASE}?resource=ticket&id=${id}`);
  },

  async postMessage(
    ticketId: number,
    message: string,
    attachment?: { url: string; name: string } | null
  ): Promise<SupportMessage> {
    const payload: Record<string, unknown> = { message };
    if (attachment?.url) {
      payload.attachment_url = attachment.url;
      payload.attachment_name = attachment.name;
    }
    const data = await authenticatedRequest(`${BASE}?resource=message&id=${ticketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return data.message;
  },

  async closeTicket(ticketId: number): Promise<void> {
    await authenticatedRequest(`${BASE}?resource=close&id=${ticketId}`, { method: "POST" });
  },
};

// --- Админ-API ---

export type AdminTicket = Ticket & {
  user_id: number | null;
  assigned_to: number | null;
  msg_count: number;
};

export type SupportTemplate = {
  id: number;
  title: string;
  body: string;
  category: string;
  sort_order: number;
  is_active: boolean;
};

async function adminFetch(path: string, init?: RequestInit) {
  const adminToken = localStorage.getItem("admin_token") || "";
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      "X-Admin-Token": adminToken,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка запроса");
  return data;
}

export const supportAdminApi = {
  async listTickets(filters: {
    status?: string;
    category?: string;
    priority?: string;
    q?: string;
  } = {}): Promise<AdminTicket[]> {
    const qs = new URLSearchParams({ resource: "admin-tickets" });
    if (filters.status) qs.set("status", filters.status);
    if (filters.category) qs.set("category", filters.category);
    if (filters.priority) qs.set("priority", filters.priority);
    if (filters.q) qs.set("q", filters.q);
    const data = await adminFetch(`?${qs.toString()}`);
    return data.tickets || [];
  },

  async stats(): Promise<{ by_status: Record<string, number>; open_count: number; last7: number }> {
    return adminFetch(`?resource=admin-stats`);
  },

  async getTicket(id: number): Promise<{ ticket: AdminTicket; messages: SupportMessage[] }> {
    return adminFetch(`?resource=admin-ticket&id=${id}`);
  },

  async postMessage(
    ticketId: number,
    message: string,
    attachment?: { url: string; name: string } | null
  ): Promise<SupportMessage> {
    const payload: Record<string, unknown> = { message };
    if (attachment?.url) {
      payload.attachment_url = attachment.url;
      payload.attachment_name = attachment.name;
    }
    const data = await adminFetch(`?resource=admin-message&id=${ticketId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data.message;
  },

  async setStatus(ticketId: number, status: TicketStatus): Promise<void> {
    await adminFetch(`?resource=admin-status&id=${ticketId}`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },

  async setPriority(ticketId: number, priority: TicketPriority): Promise<void> {
    await adminFetch(`?resource=admin-priority&id=${ticketId}`, {
      method: "POST",
      body: JSON.stringify({ priority }),
    });
  },

  async listTemplates(): Promise<SupportTemplate[]> {
    const data = await adminFetch(`?resource=admin-templates`);
    return data.templates || [];
  },

  async saveTemplate(t: Partial<SupportTemplate>): Promise<number> {
    const data = await adminFetch(`?resource=admin-templates`, {
      method: "POST",
      body: JSON.stringify(t),
    });
    return data.id;
  },

  async archiveTemplate(id: number): Promise<void> {
    await adminFetch(`?resource=admin-templates&id=${id}`, { method: "DELETE" });
  },
};