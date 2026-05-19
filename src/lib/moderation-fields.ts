import { OrgEvent } from "@/lib/organizer-api";

export const SENSITIVE_FIELDS: (keyof OrgEvent)[] = [
  "title",
  "short_description",
  "full_description",
  "description",
  "event_date",
  "end_date",
  "bath_name",
  "bath_address",
  "price_amount",
  "price_label",
  "pricing_lines",
  "image_url",
];

export const SENSITIVE_LABELS: Partial<Record<keyof OrgEvent, string>> = {
  title: "название",
  short_description: "краткое описание",
  full_description: "полное описание",
  description: "описание",
  event_date: "дата",
  end_date: "дата окончания",
  bath_name: "место",
  bath_address: "адрес",
  price_amount: "цена",
  price_label: "текст цены",
  pricing_lines: "состав участия",
  image_url: "фото обложки",
};

export function isSensitive(field: keyof OrgEvent): boolean {
  return SENSITIVE_FIELDS.includes(field);
}

export function detectSensitiveChanges(initial: OrgEvent, current: OrgEvent): string[] {
  return SENSITIVE_FIELDS.filter((f) => {
    const a = initial[f];
    const b = current[f];
    return JSON.stringify(a) !== JSON.stringify(b);
  }).map((f) => SENSITIVE_LABELS[f] || String(f));
}
