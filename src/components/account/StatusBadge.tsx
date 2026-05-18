export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    new: { label: "Новая", className: "bg-blue-500/15 text-blue-500 dark:text-blue-400" },
    confirmed: { label: "Подтверждена", className: "bg-green-500/15 text-green-600 dark:text-green-400" },
    cancelled: { label: "Отменена", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
  };
  const badge = map[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
}