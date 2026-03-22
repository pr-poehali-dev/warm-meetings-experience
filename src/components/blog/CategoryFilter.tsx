import Icon from "@/components/ui/icon";
import { BlogCategory } from "@/lib/blog-data";

interface CategoryFilterProps {
  categories: BlogCategory[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

export default function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border ${
          selected === null
            ? "bg-foreground text-background border-foreground"
            : "bg-transparent text-muted-foreground border-border hover:border-foreground/30"
        }`}
      >
        Все
      </button>
      {categories.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => onSelect(cat.slug === selected ? null : cat.slug)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border ${
            selected === cat.slug
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground/30"
          }`}
        >
          <Icon name={cat.icon} size={14} />
          {cat.name}
        </button>
      ))}
    </div>
  );
}
