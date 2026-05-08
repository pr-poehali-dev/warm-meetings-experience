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
  is_system: boolean;
  created_at: string;
};

export const supportApi = {
  async fetchFaq(role?: string): Promise<FaqItem[]> {
    const url = `${BASE}?resource=faq${role ? `&role=${encodeURIComponent(role)}` : ""}`;
    const data = await request(url);
    return data.faq || [];
  },

  async createTicket(payload: {
    name: string;
    email: string;
    subject: string;
    category: string;
    message: string;
    captcha_ok?: boolean;
    priority?: TicketPriority;
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

  async postMessage(ticketId: number, message: string): Promise<SupportMessage> {
    const data = await authenticatedRequest(`${BASE}?resource=message&id=${ticketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    return data.message;
  },

  async closeTicket(ticketId: number): Promise<void> {
    await authenticatedRequest(`${BASE}?resource=close&id=${ticketId}`, { method: "POST" });
  },
};
