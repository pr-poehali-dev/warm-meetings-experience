import Icon from "@/components/ui/icon";

interface Props {
  /** Если true — не показывать (например, в режиме создания, когда модерации еще не было) */
  hidden?: boolean;
  className?: string;
}

/** Маленький значок-щит рядом с полем, изменение которого вызовет повторную модерацию. */
export default function SensitiveFieldBadge({ hidden, className = "" }: Props) {
  if (hidden) return null;
  return (
    <span
      title="Изменение этого поля отправит событие на повторную модерацию администратору"
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-50 border border-amber-200 text-amber-600 cursor-help shrink-0 ${className}`}
      aria-label="Поле требует повторной модерации"
    >
      <Icon name="ShieldAlert" size={10} />
    </span>
  );
}