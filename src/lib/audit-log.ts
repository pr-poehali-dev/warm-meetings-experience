import { adminModerationRequest } from "@/lib/http";
import func2url from "../../backend/func2url.json";

const AUDIT_API = func2url["audit-log"];

export type AuditEntityType =
  | "ticket"
  | "user"
  | "booking"
  | "signup"
  | "event"
  | "bath"
  | "master"
  | "video"
  | "article";

export interface AuditEvent {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  actor_type: string;
  actor_id: number | null;
  actor_name: string | null;
  comment: string | null;
  created_at: string;
}

export const auditLog = {
  /** Получить историю по сущности (последние limit записей). */
  async list(
    entityType: AuditEntityType | string,
    entityId: string | number,
    limit = 100,
  ): Promise<AuditEvent[]> {
    const url = `${AUDIT_API}?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(String(entityId))}&limit=${limit}`;
    try {
      const data = await adminModerationRequest(url) as { events?: AuditEvent[] };
      return data.events || [];
    } catch {
      return [];
    }
  },

  /** Записать произвольное событие. Используется для действий, которые не логирует backend сам. */
  async record(payload: {
    entity_type: AuditEntityType | string;
    entity_id: string | number;
    action: string;
    field?: string;
    old_value?: string | null;
    new_value?: string | null;
    comment?: string;
    actor_name?: string;
  }): Promise<void> {
    try {
      await adminModerationRequest(AUDIT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          entity_id: String(payload.entity_id),
          actor_name: payload.actor_name || "Администратор",
        }),
      });
    } catch {
      /* не блокируем основное действие */
    }
  },
};