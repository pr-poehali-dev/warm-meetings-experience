/**
 * Утилиты для работы со структурированным описанием услуги мастера.
 * Описание хранится в одном текстовом поле `MasterService.description`
 * как markdown с заголовками разделов:
 *   "Что входит:"
 *   "Что взять с собой:"
 *   "Противопоказания:"
 * и пунктами списка через `- `.
 */

export interface ParsedDescription {
  intro: string;
  included: string[];
  bring: string[];
  contraindications: string[];
}

const HEADER_INCLUDED = /^(что входит|включено|в стоимость входит|программа)$/i;
const HEADER_BRING = /^(что взять|что взять с собой|с собой|с собой нужно)$/i;
const HEADER_CONTRA = /^(противопоказания|не подходит|ограничения|важно знать)$/i;

const HEADER_RE = /^(?:#{1,3}\s*)?(.+?)\s*[:：]?\s*$/;
const BULLET_RE = /^\s*(?:[-•*—]|\d+[.)])\s+(.+?)\s*$/;

export function parseServiceDescription(raw?: string | null): ParsedDescription {
  const empty: ParsedDescription = { intro: "", included: [], bring: [], contraindications: [] };
  if (!raw) return empty;

  type Section = "intro" | "included" | "bring" | "contra";
  let section: Section = "intro";
  const buckets: Record<Section, string[]> = { intro: [], included: [], bring: [], contra: [] };

  const detectHeader = (text: string): Section | null => {
    const m = text.match(HEADER_RE);
    if (!m) return null;
    const t = m[1].toLowerCase().trim();
    if (HEADER_INCLUDED.test(t)) return "included";
    if (HEADER_BRING.test(t)) return "bring";
    if (HEADER_CONTRA.test(t)) return "contra";
    return null;
  };

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (section === "intro") buckets.intro.push("");
      continue;
    }
    const newSection = detectHeader(trimmed);
    if (newSection) {
      section = newSection;
      continue;
    }
    const bullet = trimmed.match(BULLET_RE);
    if (bullet && section !== "intro") {
      buckets[section].push(bullet[1].trim());
    } else if (section === "intro") {
      buckets.intro.push(trimmed);
    } else {
      buckets[section].push(trimmed);
    }
  }

  return {
    intro: buckets.intro.join("\n").trim(),
    included: buckets.included,
    bring: buckets.bring,
    contraindications: buckets.contra,
  };
}

/**
 * Собрать структурированное описание обратно в единый текст.
 */
export function buildServiceDescription(parsed: ParsedDescription): string {
  const parts: string[] = [];
  const intro = (parsed.intro || "").trim();
  if (intro) parts.push(intro);

  const block = (title: string, items: string[]) => {
    const clean = items.map((s) => s.trim()).filter(Boolean);
    if (!clean.length) return;
    parts.push(`${title}:\n${clean.map((s) => `- ${s}`).join("\n")}`);
  };

  block("Что входит", parsed.included);
  block("Что взять с собой", parsed.bring);
  block("Противопоказания", parsed.contraindications);

  return parts.join("\n\n");
}
