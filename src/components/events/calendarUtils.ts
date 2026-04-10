export const TYPE_META: Record<string, { dot: string; label: string; short: string }> = {
  "мужской":   { dot: "bg-[#C0674B]", label: "Мужской",   short: "М"  },
  "женский":   { dot: "bg-[#E8A2A2]", label: "Женский",   short: "Ж"  },
  "смешанный": { dot: "bg-[#5B8C5A]", label: "Смешанный", short: "С"  },
  "мастер":    { dot: "bg-[#4A90E2]", label: "С мастером", short: "Мс" },
  "мужской пар": { dot: "bg-[#C0674B]", label: "Мужской пар", short: "М" },
  "женский пар": { dot: "bg-[#E8A2A2]", label: "Женский пар", short: "Ж" },
};

export const LEGEND = [
  { dot: "bg-[#C0674B]", label: "Мужской" },
  { dot: "bg-[#E8A2A2]", label: "Женский" },
  { dot: "bg-[#5B8C5A]", label: "Смешанный" },
  { dot: "bg-[#4A90E2]", label: "С мастером" },
];

export function getTypeMeta(type: string) {
  const key = Object.keys(TYPE_META).find((k) => type.toLowerCase().includes(k));
  return key ? TYPE_META[key] : { dot: "bg-gray-400", label: type, short: type.slice(0, 2) };
}
