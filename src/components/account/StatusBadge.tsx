export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    new: { label: "Новая", className: "bg-blue-50 text-blue-700" },
    confirmed: { label: "Подтверждена", className: "bg-green-50 text-green-700" },
    cancelled: { label: "Отменена", className: "bg-red-50 text-red-700" },
  };
  const badge = map[status] || { label: status, className: "bg-gray-50 text-gray-700" };
  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
}
